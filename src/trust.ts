/** Loopback Host fence and secret-free authorization URL checks. */

export const XAI_AUTH_HOSTS = [
  'auth.x.ai',
  'accounts.x.ai',
  'x.ai',
  'www.x.ai',
  'grok.com',
  'www.grok.com',
  'x.com',
  'www.x.com',
  'twitter.com',
  'www.twitter.com',
] as const

export function isXaiAuthHost(host: string): boolean {
  const hostname = host.toLowerCase()
  if ((XAI_AUTH_HOSTS as readonly string[]).includes(hostname)) return true
  return hostname.endsWith('.x.ai')
    || hostname.endsWith('.grok.com')
    || hostname.endsWith('.x.com')
    || hostname.endsWith('.twitter.com')
}

export const MAX_JSON_BODY_BYTES = 64 * 1024

export const MAX_SELECTED_MODELS = 64

export class RequestBodyTooLargeError extends Error {
  constructor() {
    super('request body too large')
    this.name = 'RequestBodyTooLargeError'
  }
}

/** True when Host is a loopback authority (DNS-rebinding defense). */
export function isLoopbackHost(hostHeader: string): boolean {
  try {
    const hostname = new URL(`http://${hostHeader}`).hostname.replace(/^\[|\]$/g, '').toLowerCase()
    return hostname === '127.0.0.1' || hostname === 'localhost' || hostname === '::1'
  } catch {
    return false
  }
}

export function isLoopbackAddress(remote: string | undefined): boolean {
  return remote === '127.0.0.1' || remote === '::1' || remote === '::ffff:127.0.0.1'
}

/**
 * Same reachability posture as dsh `/api`: loopback socket + loopback Host.
 * Origin, when present, must match Host. Cross-site Fetch Metadata is refused.
 */
export function trustedRequest(req: {
  socket: { remoteAddress?: string }
  headers: { host?: string; origin?: string; 'sec-fetch-site'?: string | string[] }
}): boolean {
  if (!isLoopbackAddress(req.socket.remoteAddress)) return false
  const host = req.headers.host
  if (host === undefined || !isLoopbackHost(host)) return false
  const site = req.headers['sec-fetch-site']
  if (site === 'cross-site') return false
  const origin = req.headers.origin
  if (origin === undefined) return true
  try {
    return new URL(origin).host === new URL(`http://${host}`).host
  } catch {
    return false
  }
}

/**
 * Device-code pages are opened in the user's browser. Refuse non-HTTPS
 * (javascript:, http:) but do not abort login over an unexpected https host —
 * xAI has used several first-party hosts, and rejecting them closed the popup.
 */
export function assertSafeAuthorizationUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new Error('xAI returned an invalid authorization URL')
  }
  if (url.protocol !== 'https:') {
    throw new Error('xAI returned an unsafe authorization URL')
  }
  return url.href
}

export function isTerminalOAuthFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /invalid_grant|authorization revoked|refresh token.*(expired|revoked)|revoked grant/i.test(message)
}
