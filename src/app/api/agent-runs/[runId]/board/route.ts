import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireWorkspaceMembership } from '@/lib/supabase/authorization'

interface RouteContext {
  params: Promise<{ runId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { runId } = await context.params

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

  const { authorized } = await requireWorkspaceMembership(
    supabase,
    user.id,
    run.workspace_id
  )
  if (!authorized) {
    return NextResponse.json({ data: null, error: 'Forbidden' }, { status: 403 })
  }

  const { data: tasks, error } = await supabase
    .from('agent_tasks')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })

  if (error) {
    return NextResponse.json(
      { data: null, error: error.message },
      { status: 500 }
    )
  }

  const columns = {
    todo: [] as Record<string, unknown>[],
    in_progress: [] as Record<string, unknown>[],
    blocked: [] as Record<string, unknown>[],
    done: [] as Record<string, unknown>[],
  }

  for (const task of tasks ?? []) {
    if (task.status in columns) {
      columns[task.status as keyof typeof columns].push(task)
    }
  }

  const unresolvedNeedsInput = (tasks ?? []).filter((task) => {
    const outputRef =
      task.output_ref && typeof task.output_ref === 'object'
        ? (task.output_ref as Record<string, unknown>)
        : null
    return outputRef?.needs_input_open === true
  }).length

  const openBranches = (tasks ?? []).filter((task) => {
    const outputRef =
      task.output_ref && typeof task.output_ref === 'object'
        ? (task.output_ref as Record<string, unknown>)
        : null
    return typeof outputRef?.branch_id === 'string'
  }).length

  return NextResponse.json({
    data: {
      run,
      columns,
      readiness: {
        unresolved_needs_input: unresolvedNeedsInput,
        open_branch_proposals: openBranches,
        tasks_remaining: columns.todo.length + columns.in_progress.length + columns.blocked.length,
      },
    },
    error: null,
  })
}
