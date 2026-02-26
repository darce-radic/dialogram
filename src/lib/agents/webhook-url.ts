function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname.endsWith('.localhost')
}

function isPrivateIpv4(hostname: string) {
  const parts = hostname.split('.').map((p) => Number(p))
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false
  }

  if (parts[0] === 10) return true
  if (parts[0] === 127) return true
  if (parts[0] === 0) return true
  if (parts[0] === 169 && parts[1] === 254) return true
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true
  if (parts[0] === 192 && parts[1] === 168) return true

  return false
}

export function validateWebhookUrl(raw: unknown) {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true as const, value: null as string | null }
  }

  if (typeof raw !== 'string') {
    return { ok: false as const, error: 'webhook_url must be a string URL' }
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return { ok: false as const, error: 'webhook_url must be a valid URL' }
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false as const, error: 'webhook_url must use http or https' }
  }

  const hostname = parsed.hostname.toLowerCase()
  if (isLocalHost(hostname) || isPrivateIpv4(hostname)) {
    return { ok: false as const, error: 'webhook_url must not target localhost/private network hosts' }
  }

  return { ok: true as const, value: parsed.toString() }
}
