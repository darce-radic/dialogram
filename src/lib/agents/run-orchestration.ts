export type AgentRunStatus = 'active' | 'blocked' | 'completed' | 'cancelled'
export type AgentTaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done'
export type AgentTaskType =
  | 'research'
  | 'write'
  | 'review'
  | 'qa'
  | 'synthesis'

const runTransitions: Record<AgentRunStatus, AgentRunStatus[]> = {
  active: ['blocked', 'completed', 'cancelled'],
  blocked: ['active', 'cancelled'],
  completed: [],
  cancelled: [],
}

export function canTransitionRunStatus(
  current: AgentRunStatus,
  next: AgentRunStatus
) {
  return runTransitions[current].includes(next)
}

export function areTaskDependenciesSatisfied(
  dependsOn: string[],
  taskStatuses: Record<string, AgentTaskStatus>
) {
  return dependsOn.every((taskId) => taskStatuses[taskId] === 'done')
}

function getRange(scope: unknown): { from: number; to: number } | null {
  if (!scope || typeof scope !== 'object') return null
  const asRecord = scope as Record<string, unknown>
  if (
    typeof asRecord.from !== 'number' ||
    typeof asRecord.to !== 'number' ||
    !Number.isFinite(asRecord.from) ||
    !Number.isFinite(asRecord.to)
  ) {
    return null
  }
  const from = Math.min(asRecord.from, asRecord.to)
  const to = Math.max(asRecord.from, asRecord.to)
  return { from, to }
}

export function hasScopeOverlap(scopeA: unknown, scopeB: unknown) {
  const rangeA = getRange(scopeA)
  const rangeB = getRange(scopeB)
  if (!rangeA || !rangeB) return false
  return rangeA.from <= rangeB.to && rangeB.from <= rangeA.to
}

export function validateTaskDoneOutput(
  taskType: AgentTaskType,
  outputRef: Record<string, unknown> | null
): { ok: true } | { ok: false; error: string } {
  if (taskType !== 'write') return { ok: true }

  const hasBranchId =
    outputRef &&
    typeof outputRef.branch_id === 'string' &&
    outputRef.branch_id.length > 0
  const hasNoChangeReason =
    outputRef &&
    typeof outputRef.no_change_reason === 'string' &&
    outputRef.no_change_reason.length > 0

  if (!hasBranchId && !hasNoChangeReason) {
    return {
      ok: false,
      error:
        'Write task completion requires output_ref.branch_id or output_ref.no_change_reason',
    }
  }

  return { ok: true }
}
