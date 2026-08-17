/**
 * Windows users often have HTTP(S)_PROXY set (Clash, etc.). PowerShell uses
 * it; Node's built-in fetch does not, so login dies with "fetch failed".
 */
import { setDefaultResultOrder } from 'node:dns'
import { EnvHttpProxyAgent, setGlobalDispatcher } from 'undici'

let installed = false

function envValue(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]
    if (value !== undefined && value.trim().length > 0) return value.trim()
  }
  return undefined
}

/** Prefer IPv4 and send undici/fetch through HTTP(S)_PROXY when present. */
export function installNetworkDefaults(): void {
  if (installed) return
  installed = true
  try {
    setDefaultResultOrder('ipv4first')
  } catch {
    // Older Node without the DNS option.
  }
  const proxy = envValue('HTTPS_PROXY', 'https_proxy', 'HTTP_PROXY', 'http_proxy', 'ALL_PROXY', 'all_proxy')
  if (proxy === undefined) return
  if (envValue('NO_PROXY', 'no_proxy') === undefined) {
    process.env.NO_PROXY = 'localhost,127.0.0.1,::1'
  }
  setGlobalDispatcher(new EnvHttpProxyAgent())
}
