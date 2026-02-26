import { NextResponse } from 'next/server'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { canManageRun, parseBody } from '@/lib/agents/run-api'
import {
  hasScopeOverlap,
  type AgentTaskStatus,
  type AgentTaskType,
} from '@/lib/agents/run-orchestration'

interface RouteContext {
  params: Promise<{ runId: string }>
}

const taskTypes: AgentTaskType[] = ['research', 'write', 'review', 'qa', 'synthesis']
const taskStatuses: AgentTaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

async function loadRunWithUser(runId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: run, error } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (error || !run) {
    return NextResponse.json({ data: null, error: 'Run not found' }, { status: 404 })
  }

  const { authorized, role } = await requireWorkspaceMembership(
    supabase,
    user.id,
    run.workspace_id
  )

  if (!authorized || !role) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  return {
    supabase,
    user,
    role,
    run,
  }
}

export async function POST(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'agent-runs.tasks.create',
    limit: 120,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { runId } = await context.params

  const loaded = await loadRunWithUser(runId)
  if (loaded instanceof NextResponse) return loaded

  const { supabase, user, role, run } = loaded
  if (!canManageRun(run.created_by, { userId: user.id, role, client: supabase })) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const bodyResult = await parseBody(request)
  if (bodyResult instanceof NextResponse) return bodyResult
  const body = bodyResult as Record<string, unknown>

  if (!body.title || !body.task_type || !body.assigned_agent_key_id) {
    return NextResponse.json(
      { data: null, error: 'title, task_type, assigned_agent_key_id are required' },
      { status: 400 }
    )
  }

  const title = String(body.title).trim()
  if (title.length === 0 || title.length > 500) {
    return NextResponse.json(
      { data: null, error: 'title must be 1-500 characters' },
      { status: 400 }
    )
  }

  const taskType = body.task_type as AgentTaskType
  if (!taskTypes.includes(taskType)) {
    return NextResponse.json(
      { data: null, error: 'Invalid task_type' },
      { status: 400 }
    )
  }

  const status = (body.status as AgentTaskStatus | undefined) ?? 'todo'
  if (!taskStatuses.includes(status)) {
    return NextResponse.json(
      { data: null, error: 'Invalid status' },
      { status: 400 }
    )
  }

  const assignedAgentKeyId = String(body.assigned_agent_key_id)
  const { data: agentKey } = await supabase
    .from('agent_keys')
    .select('id, workspace_id, is_active')
    .eq('id', assignedAgentKeyId)
    .single()

  if (!agentKey || agentKey.workspace_id !== run.workspace_id || !agentKey.is_active) {
    return NextResponse.json(
      { data: null, error: 'assigned_agent_key_id must be an active key in run workspace' },
      { status: 400 }
    )
  }

  const dependsOn = Array.isArray(body.depends_on)
    ? body.depends_on.filter((v): v is string => typeof v === 'string')
    : []

  if (dependsOn.length > 0) {
    const { data: existingDependencies } = await supabase
      .from('agent_tasks')
      .select('id')
      .eq('run_id', runId)
      .in('id', dependsOn)

    const existingIds = new Set((existingDependencies ?? []).map((d) => d.id))
    const missing = dependsOn.filter((id) => !existingIds.has(id))
    if (missing.length > 0) {
      return NextResponse.json(
        {
          data: null,
          error: `depends_on contains tasks outside this run: ${missing.join(', ')}`,
        },
        { status: 400 }
      )
    }
  }

  const acceptanceCriteria =
    Array.isArray(body.acceptance_criteria) && body.acceptance_criteria.every((v) => typeof v === 'string')
      ? body.acceptance_criteria
      : []

  const documentScope =
    body.document_scope && typeof body.document_scope === 'object'
      ? body.document_scope
      : null

  if (taskType === 'write' && documentScope) {
    const { data: existingWriteTasks } = await supabase
      .from('agent_tasks')
      .select('id, document_scope, status')
      .eq('run_id', runId)
      .eq('task_type', 'write')
      .in('status', ['todo', 'in_progress'])

    const overlapping = (existingWriteTasks ?? []).find((task) =>
      hasScopeOverlap(documentScope, task.document_scope)
    )

    if (overlapping) {
      return NextResponse.json(
        {
          data: null,
          error: `document_scope overlaps with existing write task ${overlapping.id}`,
        },
        { status: 400 }
      )
    }
  }

  if (status === 'in_progress') {
    const { data: inProgressTasks } = await supabase
      .from('agent_tasks')
      .select('id')
      .eq('run_id', runId)
      .eq('status', 'in_progress')

    if ((inProgressTasks ?? []).length >= run.max_parallel_agents) {
      return NextResponse.json(
        {
          data: null,
          error: `Run already has max in_progress tasks (${run.max_parallel_agents})`,
        },
        { status: 400 }
      )
    }
  }

  const { data, error } = await supabase
    .from('agent_tasks')
    .insert({
      run_id: runId,
      workspace_id: run.workspace_id,
      document_id: run.document_id,
      title,
      document_scope: documentScope,
      assigned_agent_key_id: assignedAgentKeyId,
      task_type: taskType,
      status,
      depends_on: dependsOn,
      acceptance_criteria: acceptanceCriteria,
      output_ref:
        body.output_ref && typeof body.output_ref === 'object'
          ? body.output_ref
          : null,
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
