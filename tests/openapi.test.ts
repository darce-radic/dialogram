import test from 'node:test'
import assert from 'node:assert/strict'
import { openApiSpec } from '@/lib/openapi/spec'

test('openapi includes required integration paths', () => {
  const required = [
    '/openapi.json',
    '/workspaces',
    '/workspaces/{workspaceId}/documents',
    '/workspaces/{workspaceId}/members',
    '/documents',
    '/documents/{documentId}',
    '/documents/{documentId}/threads',
    '/documents/{documentId}/threads/{threadId}',
    '/documents/{documentId}/threads/{threadId}/comments',
    '/documents/{documentId}/scratchpad',
    '/documents/{documentId}/scratchpad/stream',
    '/documents/{documentId}/branches',
    '/documents/{documentId}/branches/{branchId}',
    '/folders',
    '/folders/{folderId}',
    '/agent-keys',
    '/agent-keys/names',
    '/agent-keys/{keyId}',
    '/agent-memory',
    '/agent-memory/search',
    '/agent-memory/{memoryId}',
    '/agent-runs',
    '/agent-runs/{runId}',
    '/agent-runs/{runId}/board',
    '/agent-runs/{runId}/tasks',
    '/agent-runs/{runId}/tasks/{taskId}',
  ]

  for (const path of required) {
    assert.ok(
      Object.prototype.hasOwnProperty.call(openApiSpec.paths, path),
      `Missing OpenAPI path: ${path}`
    )
  }
})

test('document patch path declares 200 and 202 modes', () => {
  const patch =
    openApiSpec.paths['/documents/{documentId}']?.patch?.responses ?? {}

  assert.ok(
    Object.prototype.hasOwnProperty.call(patch, '200'),
    'PATCH /documents/{documentId} should declare 200 response'
  )
  assert.ok(
    Object.prototype.hasOwnProperty.call(patch, '202'),
    'PATCH /documents/{documentId} should declare 202 response'
  )
})

test('key mutation endpoints declare 429 responses', () => {
  const mutations = [
    { path: '/workspaces', method: 'post' },
    { path: '/documents', method: 'post' },
    { path: '/documents/{documentId}', method: 'patch' },
    { path: '/documents/{documentId}/threads', method: 'post' },
    { path: '/documents/{documentId}/threads/{threadId}/comments', method: 'post' },
    { path: '/documents/{documentId}/scratchpad', method: 'post' },
    { path: '/agent-keys', method: 'post' },
    { path: '/agent-memory', method: 'post' },
  ] as const

  for (const mutation of mutations) {
    const op = (openApiSpec.paths[mutation.path] as Record<string, unknown>)[
      mutation.method
    ] as { responses?: Record<string, unknown> } | undefined
    assert.ok(op, `Missing operation: ${mutation.method.toUpperCase()} ${mutation.path}`)
    const responses = op?.responses ?? {}
    assert.ok(
      Object.prototype.hasOwnProperty.call(responses, '429'),
      `Missing 429 response on ${mutation.method.toUpperCase()} ${mutation.path}`
    )
  }
})

test('agent write endpoints include request examples', () => {
  const threadExample =
    openApiSpec.paths['/documents/{documentId}/threads']?.post?.requestBody?.content?.[
      'application/json'
    ]?.examples
  const commentExample =
    openApiSpec.paths['/documents/{documentId}/threads/{threadId}/comments']?.post?.requestBody
      ?.content?.['application/json']?.examples
  const scratchpadExample =
    openApiSpec.paths['/documents/{documentId}/scratchpad']?.post?.requestBody?.content?.[
      'application/json'
    ]?.examples

  assert.ok(threadExample, 'Expected thread request examples')
  assert.ok(commentExample, 'Expected thread comment request examples')
  assert.ok(scratchpadExample, 'Expected scratchpad request examples')
})
