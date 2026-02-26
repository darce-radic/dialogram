import { NextResponse } from 'next/server'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'
import {
  authenticateWorkspaceUser,
  isErrorResponse,
  parseBody,
} from '@/lib/agents/run-api'

const runStatuses = ['active', 'blocked', 'completed', 'cancelled'] as const

type RunStatus = (typeof runStatuses)[number]

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const workspaceId = searchParams.get('workspaceId')
  if (!workspaceId) {
    return NextResponse.json(
      { data: null, error: 'workspaceId is required' },
      { status: 400 }
    )
  }

  const auth = await authenticateWorkspaceUser(workspaceId)
  if (isErrorResponse(auth)) return auth

  const statusParam = searchParams.get('status')
  const documentId = searchParams.get('documentId')
  const limit = Math.min(
    Math.max(1, parseInt(searchParams.get('limit') ?? '100', 10) || 100),
    500
  )
  const offset = Math.max(
    0,
    parseInt(searchParams.get('offset') ?? '0', 10) || 0
  )

  let query = auth.client
    .from('agent_runs')
    .select('*', { count: 'exact' })
    .eq('workspace_id', workspaceId)
    .order('created_at', { ascending: false })

  if (documentId) query = query.eq('document_id', documentId)
  if (statusParam && runStatuses.includes(statusParam as RunStatus)) {
    query = query.eq('status', statusParam)
  }

  const { data, error, count } = await query.range(offset, offset + limit - 1)

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    data: data ?? [],
    pagination: { limit, offset, total: count ?? 0 },
    error: null,
  })
}

export async function POST(request: Request) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'agent-runs.create',
    limit: 30,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const bodyResult = await parseBody(request)
  if (bodyResult instanceof NextResponse) return bodyResult
  const body = bodyResult as Record<string, unknown>

  if (
    !body.workspace_id ||
    !body.document_id ||
    !body.coordinator_agent_key_id ||
    !body.objective
  ) {
    return NextResponse.json(
      {
        data: null,
        error:
          'workspace_id, document_id, coordinator_agent_key_id, objective are required',
      },
      { status: 400 }
    )
  }

  const workspaceId = body.workspace_id as string
  const documentId = body.document_id as string
  const coordinatorAgentKeyId = body.coordinator_agent_key_id as string
  const objective = String(body.objective).trim()
  if (objective.length === 0 || objective.length > 5000) {
    return NextResponse.json(
      { data: null, error: 'objective must be 1-5000 characters' },
      { status: 400 }
    )
  }

  const auth = await authenticateWorkspaceUser(workspaceId)
  if (isErrorResponse(auth)) return auth

  const maxParallelAgents =
    typeof body.max_parallel_agents === 'number'
      ? Math.trunc(body.max_parallel_agents)
      : 3
  if (maxParallelAgents < 1 || maxParallelAgents > 10) {
    return NextResponse.json(
      { data: null, error: 'max_parallel_agents must be between 1 and 10' },
      { status: 400 }
    )
  }

  const { data: document } = await auth.client
    .from('documents')
    .select('id, workspace_id')
    .eq('id', documentId)
    .is('deleted_at', null)
    .single()

  if (!document || document.workspace_id !== workspaceId) {
    return NextResponse.json(
      { data: null, error: 'document_id not found in workspace' },
      { status: 400 }
    )
  }

  const { data: coordinatorKey } = await auth.client
    .from('agent_keys')
    .select('id, workspace_id, is_active')
    .eq('id', coordinatorAgentKeyId)
    .single()

  if (!coordinatorKey || coordinatorKey.workspace_id !== workspaceId) {
    return NextResponse.json(
      { data: null, error: 'coordinator_agent_key_id not found in workspace' },
      { status: 400 }
    )
  }

  if (!coordinatorKey.is_active) {
    return NextResponse.json(
      { data: null, error: 'coordinator_agent_key_id is inactive' },
      { status: 400 }
    )
  }

  const { data: activeRun } = await auth.client
    .from('agent_runs')
    .select('id')
    .eq('workspace_id', workspaceId)
    .eq('document_id', documentId)
    .eq('status', 'active')
    .maybeSingle()

  if (activeRun) {
    return NextResponse.json(
      { data: null, error: 'An active run already exists for this document' },
      { status: 409 }
    )
  }

  const constraints =
    body.constraints && typeof body.constraints === 'object' ? body.constraints : {}

  const { data, error } = await auth.client
    .from('agent_runs')
    .insert({
      workspace_id: workspaceId,
      document_id: documentId,
      created_by: auth.userId,
      coordinator_agent_key_id: coordinatorAgentKeyId,
      status: 'active',
      objective,
      constraints,
      max_parallel_agents: maxParallelAgents,
    })
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null }, { status: 201 })
}
