/**
 * Account-specific Grok catalog: live GET /v1/models merged onto the installed
 * pi-ai descriptors. Failures keep the last good list, then the static catalog.
 * @module dsh-xai/catalog
 */

import type { Api, Model } from '@earendil-works/pi-ai'
import { xaiProvider } from '@earendil-works/pi-ai/providers/xai'
import { DEFAULT_XAI_OAUTH_MODEL } from './ids.ts'

export const XAI_MODELS_URL = 'https://api.x.ai/v1/models'
const BODY_LIMIT_BYTES = 4 * 1024 * 1024
const LIST_TIMEOUT_MS = 15_000
const HIDDEN_GROK = /(?:^|-)(tts|voice|stt|whisper|embed|realtime)(?:-|$)/i

const BUNDLED_EXTRAS: ReadonlyArray<{ id: string; name: string; xhigh?: boolean }> = [
  { id: 'grok-4.6', name: 'Grok 4.6', xhigh: true },
  { id: 'grok-imagine-image', name: 'Grok Imagine Image' },
  { id: 'grok-imagine-image-quality', name: 'Grok Imagine Image Quality' },
  { id: 'grok-imagine-video', name: 'Grok Imagine Video' },
  { id: 'grok-imagine-video-1.5', name: 'Grok Imagine Video 1.5' },
]

/** Grok chat / imagine ids, plus anything already in the installed catalog. */
export function isSelectableChatModel(
  id: string,
  catalogIds?: ReadonlySet<string>,
): boolean {
  if (catalogIds?.has(id)) return true
  const lower = id.toLowerCase()
  if (!lower.startsWith('grok')) return false
  return !HIDDEN_GROK.test(lower)
}

/** Installed pi-ai catalog plus Grok 4.6 and Imagine rows the 0.82 pack omits. */
export function expandInstalledCatalog(catalog: readonly Model<Api>[]): Model<Api>[] {
  const template = catalog.find(model => model.id === DEFAULT_XAI_OAUTH_MODEL)
    ?? catalog.find(model => model.api === 'openai-responses')
    ?? catalog[0]
  if (template === undefined) return [...catalog]
  const seen = new Set(catalog.map(model => model.id))
  const extras: Model<Api>[] = []
  for (const extra of BUNDLED_EXTRAS) {
    if (seen.has(extra.id)) continue
    extras.push({
      ...template,
      id: extra.id,
      name: extra.name,
      ...extra.xhigh === true && template.thinkingLevelMap !== undefined
        ? { thinkingLevelMap: { ...template.thinkingLevelMap, xhigh: 'xhigh' } }
        : {},
    })
  }
  return extras.length === 0 ? [...catalog] : [...catalog, ...extras]
}

export type CatalogSource = 'live' | 'cache' | 'fallback'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Pull model ids from an OpenAI-shaped or gateway-shaped listing body. */
export function extractModelIds(body: unknown): string[] {
  const rows = Array.isArray(body)
    ? body
    : isRecord(body) && Array.isArray(body['data'])
      ? body['data']
      : isRecord(body) && Array.isArray(body['models'])
        ? body['models']
        : []
  const ids: string[] = []
  for (const row of rows) {
    if (typeof row === 'string' && row.length > 0) ids.push(row)
    else if (isRecord(row) && typeof row['id'] === 'string' && row['id'].length > 0) ids.push(row['id'])
  }
  return [...new Set(ids)]
}

function titleCaseId(id: string): string {
  return id
    .split(/[-_]/g)
    .map(part => part.length === 0 ? part : part[0]!.toUpperCase() + part.slice(1))
    .join(' ')
}

function catalogModels(baseline: readonly Model<Api>[] = xaiProvider().getModels()): readonly Model<Api>[] {
  return expandInstalledCatalog(baseline)
}

function templateFor(id: string, catalog: readonly Model<Api>[]): Model<Api> {
  const exact = catalog.find(model => model.id === id)
  if (exact !== undefined) return exact
  const lower = id.toLowerCase()
  const fallback = catalog.find(model => model.id === DEFAULT_XAI_OAUTH_MODEL) ?? catalog[0]
  if (fallback === undefined) throw new Error('xai-oauth: installed xAI catalog is empty')
  if (lower.includes('build') || lower.includes('code-fast')) {
    return catalog.find(model => model.id === 'grok-build-0.1') ?? fallback
  }
  if (/grok-4\.[56]/.test(lower) || lower.includes('4.20') || lower.includes('reasoning')) {
    return catalog.find(model => model.api === 'openai-responses') ?? fallback
  }
  return fallback
}

/** Turn a live id into a pi-ai model, inheriting catalog metadata when possible. */
export function materializeLiveModel(id: string, catalog: readonly Model<Api>[] = catalogModels()): Model<Api> {
  const template = templateFor(id, catalog)
  if (template.id === id) return template
  return { ...template, id, name: titleCaseId(id) }
}

/**
 * Serve live grok ids when present, then keep bundled extras the listing
 * omitted so 4.6 / Imagine stay visible even if /v1/models fails.
 */
export function mergeLiveCatalog(
  catalog: readonly Model<Api>[],
  liveIds: readonly string[] | undefined,
): Model<Api>[] {
  const expanded = expandInstalledCatalog(catalog)
  if (liveIds === undefined || liveIds.length === 0) return expanded
  const catalogIds = new Set(expanded.map(model => model.id))
  const liveGrok = liveIds.filter(id => isSelectableChatModel(id, catalogIds))
  const merged = liveGrok.map(id => materializeLiveModel(id, expanded))
  const seen = new Set(merged.map(model => model.id))
  for (const model of expanded) {
    if (!seen.has(model.id)) merged.push(model)
  }
  return merged
}

export function preferredXaiOAuthModelFrom(models: readonly { id: string }[]): string {
  const ids = new Set(models.map(model => model.id))
  if (ids.has('grok-4.6')) return 'grok-4.6'
  if (ids.has(DEFAULT_XAI_OAUTH_MODEL)) return DEFAULT_XAI_OAUTH_MODEL
  return models[0]?.id ?? DEFAULT_XAI_OAUTH_MODEL
}

/** Fetch the account-visible model ids. Throws a secret-free error on failure. */
export async function fetchLiveModelIds(
  accessToken: string,
  signal?: AbortSignal,
): Promise<string[]> {
  const timeout = AbortSignal.timeout(LIST_TIMEOUT_MS)
  const combined = signal === undefined ? timeout : AbortSignal.any([signal, timeout])
  let response: Response
  try {
    response = await fetch(XAI_MODELS_URL, {
      headers: {
        accept: 'application/json',
        authorization: `Bearer ${accessToken}`,
      },
      signal: combined,
    })
  } catch (error) {
    if (combined.aborted) {
      throw new Error(signal?.aborted ? 'Live model listing was cancelled' : 'xAI model listing timed out')
    }
    throw new Error('xAI model listing is unreachable')
  }
  const raw = Buffer.from(await response.arrayBuffer())
  if (raw.byteLength > BODY_LIMIT_BYTES) {
    throw new Error('xAI model listing exceeded the 4 MiB read ceiling')
  }
  let body: unknown
  try {
    body = JSON.parse(raw.toString('utf8'))
  } catch {
    throw new Error(`xAI model listing returned invalid JSON (HTTP ${response.status})`)
  }
  if (!response.ok) {
    const code = isRecord(body) && typeof body['error'] === 'string' ? body['error'] : undefined
    throw new Error(`xAI model listing failed (HTTP ${response.status})${code === undefined ? '' : `: ${code}`}`)
  }
  const ids = extractModelIds(body)
  if (ids.length === 0) throw new Error('xAI model listing contained no model ids')
  return ids
}
