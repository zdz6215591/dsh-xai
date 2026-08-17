function causeChain(error: unknown): string {
  const parts: string[] = []
  const seen = new Set<unknown>()
  let current: unknown = error
  while (current !== undefined && current !== null && !seen.has(current) && parts.join(': ').length < 800) {
    seen.add(current)
    if (current instanceof Error) {
      const code = (current as NodeJS.ErrnoException).code
      const piece = code !== undefined && code.length > 0 && !current.message.includes(code)
        ? `${current.message} (${code})`
        : current.message
      if (piece.length > 0 && (parts.length === 0 || parts[parts.length - 1] !== piece)) parts.push(piece)
      current = current.cause
      continue
    }
    parts.push(String(current))
    break
  }
  return parts.join(': ')
}

/** Remove token-like strings from an external OAuth diagnostic. */
export function safeMessage(error: unknown): string {
  return causeChain(error)
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/gu, '[redacted token]')
    .replace(/(\b(?:code|token|refresh_token|access_token)=)[^&\s]+/giu, '$1[redacted]')
    .slice(0, 1000)
}
