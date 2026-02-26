import { NextResponse } from 'next/server'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { canManageRun, parseBody } from '@/lib/agents/run-api'
import {
  canTransitionRunStatus,
  type AgentRunStatus,
} from '@/lib/agents/run-orchestration'

interface RouteContext {
  params: Promise<{ runId: string }>
}

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

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params

  const loaded = await loadRunWithUser(runId)
  if (loaded instanceof NextResponse) return loaded

  const { supabase, run } = loaded

  const { data: tasks } = await supabase
    .from('agent_tasks')
    .select('id, status')
    .eq('run_id', runId)

  const counts = { todo: 0, in_progress: 0, blocked: 0, done: 0 }
  for (const task of tasks ?? []) {
    if (task.status in counts) counts[task.status as keyof typeof counts] += 1
  }

  return NextResponse.json({
    data: {
      run,
      summary: {
        task_counts: counts,
        total_tasks: (tasks ?? []).length,
      },
    },
    error: null,
  })
}

export async function PATCH(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'agent-runs.update',
    limit: 60,
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

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.status !== undefined) {
    const nextStatus = body.status as AgentRunStatus
    if (!['active', 'blocked', 'completed', 'cancelled'].includes(nextStatus)) {
      return NextResponse.json(
        { data: null, error: 'Invalid status' },
        { status: 400 }
      )
    }

    if (!canTransitionRunStatus(run.status as AgentRunStatus, nextStatus)) {
      return NextResponse.json(
        {
          data: null,
          error: `Invalid status transition from ${run.status} to ${nextStatus}`,
        },
        { status: 400 }
      )
    }

    if (nextStatus === 'completed') {
      const { data: tasks, error: tasksError } = await supabase
        .from('agent_tasks')
        .select('id, status, output_ref')
        .eq('run_id', runId)

      if (tasksError) {
        return NextResponse.json(
          { data: null, error: tasksError.message },
          { status: 500 }
        )
      }

      const notDone = (tasks ?? []).filter((task) => task.status !== 'done')
      if (notDone.length > 0) {
        return NextResponse.json(
          { data: null, error: 'Cannot complete run while tasks are not done' },
          { status: 400 }
        )
      }

      const unresolvedNeedsInput = (tasks ?? []).filter((task) => {
        const outputRef =
          task.output_ref && typeof task.output_ref === 'object'
            ? (task.output_ref as Record<string, unknown>)
            : null
        return outputRef?.needs_input_open === true
      })

      if (unresolvedNeedsInput.length > 0) {
        return NextResponse.json(
          {
            data: null,
            error:
              'Cannot complete run while output_ref.needs_input_open is still true',
          },
          { status: 400 }
        )
      }
    }

    updateData.status = nextStatus
  }

  if (body.objective !== undefined) {
    if (typeof body.objective !== 'string' || body.objective.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: 'objective must be a non-empty string' },
        { status: 400 }
      )
    }
    updateData.objective = body.objective.trim()
  }

  if (body.constraints !== undefined) {
    if (!body.constraints || typeof body.constraints !== 'object') {
      return NextResponse.json(
        { data: null, error: 'constraints must be an object' },
        { status: 400 }
      )
    }
    updateData.constraints = body.constraints
  }

  if (body.max_parallel_agents !== undefined) {
    const maxParallelAgents =
      typeof body.max_parallel_agents === 'number'
        ? Math.trunc(body.max_parallel_agents)
        : Number.NaN
    if (!Number.isInteger(maxParallelAgents) || maxParallelAgents < 1 || maxParallelAgents > 10) {
      return NextResponse.json(
        { data: null, error: 'max_parallel_agents must be between 1 and 10' },
        { status: 400 }
      )
    }

    const { data: inProgressTasks } = await supabase
      .from('agent_tasks')
      .select('id')
      .eq('run_id', runId)
      .eq('status', 'in_progress')

    if ((inProgressTasks ?? []).length > maxParallelAgents) {
      return NextResponse.json(
        {
          data: null,
          error: 'max_parallel_agents cannot be lower than current in_progress task count',
        },
        { status: 400 }
      )
    }

    updateData.max_parallel_agents = maxParallelAgents
  }

  const { data, error } = await supabase
    .from('agent_runs')
    .update(updateData)
    .eq('id', runId)
    .select('*')
    .single()

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  return NextResponse.json({ data, error: null })
}
