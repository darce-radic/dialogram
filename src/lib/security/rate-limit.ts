import { NextResponse } from 'next/server'
import {
  incrementSecurityMetric,
  logSecurityEvent,
} from '@/lib/security/audit'

type CounterEntry = {
  count: number
  resetAt: number
}

type RateLimitInput = {
  key: string
  limit: number
  windowMs: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterSeconds: number
  resetAt: number
}

const counters = new Map<string, CounterEntry>()
const MAX_COUNTERS = 50_000

function sanitizeIp(raw: string) {
  const trimmed = raw.trim()
  if (!trimmed) return null

  // Handle IPv6 in brackets and optional :port suffix
  if (trimmed.startsWith('[')) {
    const end = trimmed.indexOf(']')
    if (end > 1) return trimmed.slice(1, end)
    return null
  }

  const colonCount = (trimmed.match(/:/g) ?? []).length
  if (colonCount === 0) {
    const [ip] = trimmed.split(':')
    return ip || null
  }

  // Assume bare IPv6
  return trimmed
}

function cleanupExpired(now: number) {
  for (const [key, entry] of counters.entries()) {
    if (entry.resetAt <= now) counters.delete(key)
  }
}

function enforceCounterBound() {
  if (counters.size <= MAX_COUNTERS) return

  for (const key of counters.keys()) {
    counters.delete(key)
    if (counters.size <= MAX_COUNTERS) break
  }
}

export function getClientIp(request: Request) {
  const trustProxyHeaders = process.env.TRUST_PROXY_HEADERS === 'true'
  if (!trustProxyHeaders) return 'unknown'

  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]
    const parsed = first ? sanitizeIp(first) : null
    if (parsed) return parsed
  }

  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    const parsed = sanitizeIp(realIp)
    if (parsed) return parsed
  }

  return 'unknown'
}

export function checkRateLimit(input: RateLimitInput): RateLimitResult {
  const now = Date.now()
  cleanupExpired(now)
  enforceCounterBound()

  const existing = counters.get(input.key)
  if (!existing || existing.resetAt <= now) {
    counters.set(input.key, { count: 1, resetAt: now + input.windowMs })
    return {
      ok: true,
      remaining: Math.max(0, input.limit - 1),
      retryAfterSeconds: Math.ceil(input.windowMs / 1000),
      resetAt: now + input.windowMs,
    }
  }

  const nextCount = existing.count + 1
  existing.count = nextCount

  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((existing.resetAt - now) / 1000)
  )

  if (nextCount > input.limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds,
      resetAt: existing.resetAt,
    }
  }

  return {
    ok: true,
    remaining: Math.max(0, input.limit - nextCount),
    retryAfterSeconds,
    resetAt: existing.resetAt,
  }
}

export function applyRouteRateLimit(
  request: Request,
  options: {
    scope: string
    limit: number
    windowMs: number
    identifier?: string
  }
) {
  const identity = options.identifier ?? getClientIp(request)
  const result = checkRateLimit({
    key: `route:${options.scope}:${identity}`,
    limit: options.limit,
    windowMs: options.windowMs,
  })

  if (result.ok) return null

  incrementSecurityMetric('rate_limit.blocked')
  logSecurityEvent('rate_limit.blocked', {
    scope: options.scope,
    identifier: identity,
    retry_after_seconds: result.retryAfterSeconds,
    limit: options.limit,
    window_ms: options.windowMs,
  })

  return NextResponse.json(
    { data: null, error: 'Rate limit exceeded' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfterSeconds),
      },
    }
  )
}
