type AuditPayload = Record<string, unknown>

const counters = new Map<string, number>()

export function incrementSecurityMetric(name: string, value = 1) {
  const current = counters.get(name) ?? 0
  counters.set(name, current + value)
}

export function getSecurityMetricsSnapshot() {
  return Object.fromEntries(counters.entries())
}

export function logSecurityEvent(event: string, payload: AuditPayload = {}) {
  const line = {
    ts: new Date().toISOString(),
    category: 'security',
    event,
    ...payload,
  }
  console.warn(JSON.stringify(line))
}
