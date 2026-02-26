import test from 'node:test'
import assert from 'node:assert/strict'
import {
  areTaskDependenciesSatisfied,
  canTransitionRunStatus,
  hasScopeOverlap,
  validateTaskDoneOutput,
} from '@/lib/agents/run-orchestration'

test('run status transition rules are enforced', () => {
  assert.equal(canTransitionRunStatus('active', 'blocked'), true)
  assert.equal(canTransitionRunStatus('blocked', 'active'), true)
  assert.equal(canTransitionRunStatus('completed', 'active'), false)
  assert.equal(canTransitionRunStatus('cancelled', 'active'), false)
})

test('task completion requires dependency tasks done', () => {
  const statuses = {
    a: 'done',
    b: 'in_progress',
  } as const

  assert.equal(areTaskDependenciesSatisfied(['a'], statuses), true)
  assert.equal(areTaskDependenciesSatisfied(['a', 'b'], statuses), false)
})

test('write task completion enforces output_ref contract', () => {
  const invalid = validateTaskDoneOutput('write', {})
  assert.equal(invalid.ok, false)

  const validBranch = validateTaskDoneOutput('write', { branch_id: 'b1' })
  assert.equal(validBranch.ok, true)

  const validNoChange = validateTaskDoneOutput('write', {
    no_change_reason: 'No edits needed',
  })
  assert.equal(validNoChange.ok, true)
})

test('write task scope overlap detects numeric range intersections', () => {
  assert.equal(hasScopeOverlap({ from: 0, to: 100 }, { from: 90, to: 200 }), true)
  assert.equal(hasScopeOverlap({ from: 0, to: 10 }, { from: 11, to: 20 }), false)
  assert.equal(hasScopeOverlap({ section: 'intro' }, { section: 'intro' }), false)
})
