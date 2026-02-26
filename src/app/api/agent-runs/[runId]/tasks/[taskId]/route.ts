import { NextResponse } from 'next/server'
import { applyRouteRateLimit } from '@/lib/security/rate-limit'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'
import { canManageRun, parseBody } from '@/lib/agents/run-api'
import {
  areTaskDependenciesSatisfied,
  validateTaskDoneOutput,
  type AgentTaskStatus,
} from '@/lib/agents/run-orchestration'

interface RouteContext {
  params: Promise<{ runId: string; taskId: string }>
}

const taskStatuses: AgentTaskStatus[] = ['todo', 'in_progress', 'blocked', 'done']

async function loadRunTaskWithUser(runId: string, taskId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ data: null, error: 'Unauthorized' }, { status: 401 })
  }

  const { data: run } = await supabase
    .from('agent_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (!run) {
    return NextResponse.json({ data: null, error: 'Run not found' }, { status: 404 })
  }

  const { data: task } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('id', taskId)
    .eq('run_id', runId)
    .single()

  if (!task) {
    return NextResponse.json({ data: null, error: 'Task not found' }, { status: 404 })
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
    task,
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const rateLimited = applyRouteRateLimit(request, {
    scope: 'agent-runs.tasks.update',
    limit: 180,
    windowMs: 60_000,
  })
  if (rateLimited) return rateLimited

  const { runId, taskId } = await context.params

  const loaded = await loadRunTaskWithUser(runId, taskId)
  if (loaded instanceof NextResponse) return loaded

  const { supabase, user, role, run, task } = loaded

  if (!canManageRun(run.created_by, { userId: user.id, role, client: supabase })) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const bodyResult = await parseBody(request)
  if (bodyResult instanceof NextResponse) return bodyResult
  const body = bodyResult as Record<string, unknown>

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }

  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length === 0) {
      return NextResponse.json(
        { data: null, error: 'title must be a non-empty string' },
        { status: 400 }
      )
    }
    updateData.title = body.title.trim()
  }

  if (body.assigned_agent_key_id !== undefined) {
    if (typeof body.assigned_agent_key_id !== 'string') {
      return NextResponse.json(
        { data: null, error: 'assigned_agent_key_id must be a string' },
        { status: 400 }
      )
    }

    const { data: key } = await supabase
      .from('agent_keys')
      .select('id, workspace_id, is_active')
      .eq('id', body.assigned_agent_key_id)
      .single()

    if (!key || key.workspace_id !== run.workspace_id || !key.is_active) {
      return NextResponse.json(
        { data: null, error: 'assigned_agent_key_id must be an active key in run workspace' },
        { status: 400 }
      )
    }

    updateData.assigned_agent_key_id = body.assigned_agent_key_id
  }

  if (body.output_ref !== undefined) {
    if (!body.output_ref || typeof body.output_ref !== 'object') {
      return NextResponse.json(
        { data: null, error: 'output_ref must be an object' },
        { status: 400 }
      )
    }
    updateData.output_ref = body.output_ref
  }

  if (body.status !== undefined) {
    const nextStatus = body.status as AgentTaskStatus
    if (!taskStatuses.includes(nextStatus)) {
      return NextResponse.json(
        { data: null, error: 'Invalid status' },
        { status: 400 }
      )
    }

    if (nextStatus === 'done') {
      const { data: dependencyTasks } = await supabase
        .from('agent_tasks')
        .select('id, status')
        .eq('run_id', runId)
        .in('id', task.depends_on ?? [])

      const dependencyMap = (dependencyTasks ?? []).reduce<Record<string, AgentTaskStatus>>(
        (acc, dep) => {
          acc[dep.id] = dep.status as AgentTaskStatus
          return acc
        },
        {}
      )

      if (!areTaskDependenciesSatisfied(task.depends_on ?? [], dependencyMap)) {
        return NextResponse.json(
          { data: null, error: 'Cannot mark done until dependencies are done' },
          { status: 400 }
        )
      }

      const doneValidation = validateTaskDoneOutput(
        task.task_type,
        ((body.output_ref ?? task.output_ref) as Record<string, unknown> | null) ?? null
      )
      if (!doneValidation.ok) {
        return NextResponse.json(
          { data: null, error: doneValidation.error },
          { status: 400 }
        )
      }
    }

    if (nextStatus === 'blocked') {
      const outputRef = ((body.output_ref ?? task.output_ref) as Record<string, unknown> | null) ?? null
      const reason = outputRef?.block_reason
      if (typeof reason !== 'string' || reason.trim().length === 0) {
        return NextResponse.json(
          { data: null, error: 'blocked status requires output_ref.block_reason' },
          { status: 400 }
        )
      }
    }

    if (nextStatus === 'in_progress' && task.status !== 'in_progress') {
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

    updateData.status = nextStatus
  }

  const { data, error } = await supabase
    .from('agent_tasks')
    .update(updateData)
    .eq('id', taskId)
    .eq('run_id', runId)
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
