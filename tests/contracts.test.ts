import test from 'node:test'
import assert from 'node:assert/strict'
import {
  parseCommunicationContract,
  parseLifecycleState,
} from '@/lib/agents/communication-contract'
import { shouldCreateBranchProposal } from '@/lib/agents/document-update-mode'
import { validateWebhookUrl } from '@/lib/agents/webhook-url'
import { getClientIp } from '@/lib/security/rate-limit'
import { extractMentionsFromText } from '@/lib/editor/utils/mention-extractor'

test('communication contract rejects missing fields', () => {
  const result = parseCommunicationContract({
    intent: 'Review',
    assumptions: [],
  })

  assert.equal(result.ok, false)
})

test('communication contract enforces question when needs_input=true', () => {
  const result = parseCommunicationContract({
    intent: 'Review',
    assumptions: ['A1'],
    action_plan: ['S1'],
    confidence: 0.4,
    needs_input: true,
  })

  assert.equal(result.ok, false)
  if (!result.ok) {
    assert.match(result.error, /question/i)
  }
})

test('lifecycle state rejects invalid value', () => {
  const result = parseLifecycleState('unknown_state')
  assert.equal(result.ok, false)
})

test('branch proposal mode for agents by default', () => {
  assert.equal(shouldCreateBranchProposal('agent', false), true)
  assert.equal(shouldCreateBranchProposal('agent', true), false)
  assert.equal(shouldCreateBranchProposal('user', false), false)
})

test('extract mentions from free text against directory', () => {
  const mentions = extractMentionsFromText(
    'Please review this @Reviewer and ask @DataBot for numbers',
    [
      { id: 'u1', name: 'Reviewer', email: 'rev@example.com', type: 'human' },
      { id: 'a1', name: 'DataBot', email: '', type: 'agent' },
    ]
  )

  assert.deepEqual(mentions, [
    { id: 'u1', type: 'user' },
    { id: 'a1', type: 'agent' },
  ])
})

test('webhook URL validation rejects local/private targets', () => {
  const badUrls = [
    'ftp://example.com/hook',
    'http://localhost:3000/hook',
    'https://127.0.0.1/hook',
    'http://192.168.1.20/hook',
    'http://10.0.0.10/hook',
  ]

  for (const url of badUrls) {
    const result = validateWebhookUrl(url)
    assert.equal(result.ok, false, `expected invalid webhook URL: ${url}`)
  }
})

test('webhook URL validation accepts public http/https targets', () => {
  const result = validateWebhookUrl('https://hooks.example.com/dialogram')
  assert.equal(result.ok, true)
  if (result.ok) {
    assert.match(result.value ?? '', /^https:\/\/hooks\.example\.com\//)
  }
})

test('client IP extraction does not trust proxy headers by default', () => {
  const previous = process.env.TRUST_PROXY_HEADERS
  delete process.env.TRUST_PROXY_HEADERS

  const request = new Request('https://example.com', {
    headers: {
      'x-forwarded-for': '203.0.113.9',
      'x-real-ip': '198.51.100.10',
    },
  })

  const ip = getClientIp(request)
  assert.equal(ip, 'unknown')

  if (previous !== undefined) process.env.TRUST_PROXY_HEADERS = previous
})

test('client IP extraction trusts proxy headers only when enabled', () => {
  const previous = process.env.TRUST_PROXY_HEADERS
  process.env.TRUST_PROXY_HEADERS = 'true'

  const request = new Request('https://example.com', {
    headers: {
      'x-forwarded-for': '203.0.113.9, 198.51.100.10',
    },
  })

  const ip = getClientIp(request)
  assert.equal(ip, '203.0.113.9')

  if (previous === undefined) {
    delete process.env.TRUST_PROXY_HEADERS
  } else {
    process.env.TRUST_PROXY_HEADERS = previous
  }
})
