# Pitfalls official tutorials underspecify

Class-level rules from shipping a real out-of-tree bundle (OAuth LLM + Settings + CLI). Apply the class, not the xAI anecdote.

## Composition

- A patch targets a row by `id` and **replaces that row's entire `config`**. Restate every key the row still needs.
- Later layers win: each `dsh.profile.bundles` patch (list order) → profile `cordis.patch.yml` → `$DSH_HOME/cordis.patch.yml` → each `--patch`.
- **Insert** your own row. Do not override `agent-default-model` or other shared product rows so installing the bundle hijacks the user's DeepSeek (or other) default.
- New LLM provider strings must be new (`xai-oauth` beside catalog `xai`). Sessions, defaults, and credentials key off the provider id.
- `dsh plugin` owns the profile manifest. Never hand-edit `dsh.profile.bundles` unless you are repairing a broken profile.

## Distribution

- `dsh plugin --profile <name> add` is pnpm inside `$DSH_HOME/profiles/<name>`. No pnpm on PATH → add fails. Enable pnpm (`corepack enable` or install it). Do not run `npm dsh` / `pnpm dsh` from `$HOME`.
- Git install fetches **sources**. Either commit built `lib/` (and list it in `files`) or ship a **self-contained** `prepare` that does not assume a monorepo checkout. pnpm ≥10 blocks that script until the package key is in the profile's `pnpm-workspace.yaml`:

  ```yaml
  allowBuilds:
    your-package: true
  ```

  That flag executes the author's code on the user's machine, outside the agent sandbox. Pin `github:owner/repo#<sha>` when the source is not yours.
- A package without `dsh.bundle` installs as a plain dependency and contributes no layer (`dsh plugin` warns).
- After `update`, restart `dsh web`. The client half is a boot-time module bundle.

## Settings slots and client modules

- Declare the browser half in `package.json`:

  ```json
  "exports": { "./client": "./lib/client.js" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "inject": ["@deepseek-ai/dsh-client-runtime"], "platform": "web" }
  }
  ```

  Add the client-ui packages you actually inject (`dsh-client-ui-settings`, `dsh-client-locale`, …).
- List slots (`settings.section`, …) are unique on `id`. A second occupant of `id: models` crashes the loader: `list slot "settings.section" already has an entry with id "models"`.
- The official Models page owns `settings.section` / `models`. To appear **inside** that page: register a unique `settings.action` (always mounted while Settings is open) and portal into the Models content column. To add a **sibling** nav item: use a new section id, never reuse `models` / `general` / other shipped ids.
- Prefer `var(--dsw-alias-*)` tokens. Register locale namespaces; do not hard-code one language.

## Host HTTP

`dsh-host-webserver` is a bare `node:http` carrier: no TLS, no login, no Origin policy. Binding `0.0.0.0` exposes every plugin route to that network.

Any plugin-owned `/plugins/<pkg>/…` route that can sign in, import credentials, or change models must copy the `/api` fence:

- peer is loopback (`127.0.0.1` / `::1` / `::ffff:127.0.0.1`)
- `Host` is a loopback authority
- `Origin`, when present, matches `Host`
- refuse `sec-fetch-site: cross-site`

Also: method allowlist, JSON body cap (tens of KB is enough for settings POSTs), `cache-control: no-store`, never put tokens in JSON. Duplicate `(kind, path)` throws — pick unique paths.

Device-code / authorize URLs: require `https:`. Do **not** abort the whole login because the host is an unexpected first-party property; providers rotate hosts. Closing the popup on that class of error looks like “Connecting… then it vanished”.

## Node egress

Node's built-in `fetch` ignores `HTTP_PROXY` / `HTTPS_PROXY`. On Windows, Clash/IE proxy makes PowerShell succeed and `dsh-xai login` die with `fetch failed` / `ConnectTimeoutError`.

If the plugin calls the public internet from Node:

1. `dns.setDefaultResultOrder('ipv4first')` (broken IPv6 is common).
2. When `HTTP(S)_PROXY` / `ALL_PROXY` is set, install undici `EnvHttpProxyAgent` via `setGlobalDispatcher`.
3. If `NO_PROXY` is empty, set `localhost,127.0.0.1,::1` so the plugin can still talk to `dsh web` on loopback.
4. Surface `error.cause` in CLI messages (`fetch failed` alone is useless).

Do not block `apply()` or the login-success path on a live catalog fetch. Persist credentials first; refresh models in the background; keep last-good then installed fallback.

## Credentials and catalogs

- Own a file under `$DSH_HOME`, atomic write + inter-process lock. Unix: reject modes with group/other bits. Windows: `chmod` is not a fence — restrict with `icacls` (inheritance off, current user `R,W`).
- Do not fall back to a sibling product's secret (`XAI_API_KEY`, another CLI's `auth.json` as the live token). Import is copy-once and must not write the source file.
- Honor `$GROK_HOME` / `$DSH_HOME` when the product documents them; do not hard-code only `~/.grok`.
- Refresh-token rotation: importing into dsh can invalidate the source CLI on next refresh. Document that; do not “fix” it by writing back.
- Removing a bundle does not delete credentials. Expose logout.
- Vendor SDKs lag the live model list. `listModels()` = live ids ∪ installed descriptors ∪ explicit extras, keyed by id. Filter by **capability class** (drop foreign tts/voice/stt/embed/realtime; keep imagine/image/video if that is in scope) — do not maintain a three-id allowlist.
- Quarantine terminal OAuth failures (`invalid_grant`, revoked refresh) as `MISSING_CREDENTIAL` so the UI asks for sign-in instead of retrying a dead grant.

## Adapter contract (beyond the tutorial snippet)

- `stream()` yields matched `block-start` / `block-end`, `usage` before `finish`.
- Throw `LlmError` with a stable code. Merge `attributionHeaders()` on every provider HTTP request. Forward `options.signal`.
- Prefer composing a shipped adapter (`PiAiAdapter`, DeepSeek adapter) and supplying tokens + model list, over re-implementing tools/reasoning/compaction.
- HTTP 403 after a successful login is often an **entitlement** gate, not a bad token. Do not loop refresh; tell the user which route/credential the provider actually accepts.
