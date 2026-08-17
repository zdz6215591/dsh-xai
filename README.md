# dsh-xai

English | [中文](README.zh.md)

Use a SuperGrok or X Premium subscription in [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) through xAI's device-code sign-in — no `XAI_API_KEY` required, and no dsh source patch required.

This repository is a fork of [MirDie/dsh-xai](https://github.com/MirDie/dsh-xai) with login, Settings, catalog, and Windows-proxy fixes. Install **this** repo, not the upstream checkout, if you want those fixes.

This is an independent dsh bundle. It adds:

- SuperGrok / X Premium OAuth from **Settings → Models** (xAI Grok card) or a standalone CLI, with automatic token refresh
- optional one-shot import of `$GROK_HOME/auth.json` (default `~/.grok/auth.json`). The Grok file is never written
- after login or import, `GET https://api.x.ai/v1/models` narrows the picker to the signed-in account; the installed catalog is the fallback
- grok-4.6 plus Imagine image/video ids when the account or fallback list includes them
- streaming, tool calls, reasoning, and dsh compaction through the normal LLM service

The catalog `xai` API-key route stays untouched. This plugin registers `xai-oauth` so both can coexist.

## Install

`dsh plugin add` shells out to **pnpm** in the profile directory. Put pnpm on PATH first (`corepack enable` is enough on Node 22+).

You do **not** need to clone this repository first:

```sh
dsh plugin --profile web add github:zdz6215591/dsh-xai
dsh web
```

If you started the UI with `npx` and have no `dsh` on PATH, use the same package as the CLI:

```sh
npx @deepseek-ai/dsh plugin --profile web add github:zdz6215591/dsh-xai
npx @deepseek-ai/dsh web
```

Do not run `npm dsh` or `pnpm dsh` from your home directory. `npx` does not install a global `dsh` command.

Clone only when you are changing this plugin:

```sh
git clone https://github.com/zdz6215591/dsh-xai.git
dsh plugin --profile web add ./dsh-xai
```

Open **Settings → Models** and use the **xAI Grok** card: **Sign in with SuperGrok**. The plugin starts xAI's device-code flow, opens the verification URL, and polls until you approve. Headless / SSH hosts can use the CLI instead:

```sh
dsh plugin --profile web exec dsh-xai login
dsh plugin --profile web exec dsh-xai import
dsh plugin --profile web exec dsh-xai status
dsh plugin --profile web exec dsh-xai logout
```

This bundle does **not** change the profile's default model. After sign-in, pick `xai-oauth / <id>` in the composer (or save it in Settings → Models). A model already saved in dsh settings still takes precedence.

The xAI Grok card can choose which account models appear in the composer picker (`xai-oauth / <id>`). Chat and Imagine image/video ids stay; TTS / voice / STT / embed / realtime ids are omitted. After updating the plugin, restart `dsh web` if the picker is still empty.

On Windows, if the system proxy (Clash, etc.) is on and CLI login prints `fetch failed`, keep that proxy running — this plugin sends Node `fetch` through `HTTP(S)_PROXY`.

See [INSTALL.md](INSTALL.md) / [INSTALL.zh.md](INSTALL.zh.md) for the full runbook.

## Credentials

dsh keeps this login separate from the Grok CLI:

- credentials are stored at `$DSH_HOME/.xai-oauth-auth.json` (`~/.dsh` by default)
- writes are atomic and token refresh is locked across local dsh processes
- browser status and diagnostics never return token values
- `import` copies `$GROK_HOME/auth.json` (default `~/.grok/auth.json`) once and never writes that file

xAI refresh tokens rotate. After import, the next dsh refresh may invalidate Grok CLI until you run `grok login` again. Removing the bundle does not delete the dsh credential; use the account page or `logout`.

## Compatibility notes

- Chat, tool calls, and reasoning ride pi-ai's xAI provider (`openai-completions` / `openai-responses`).
- Some SuperGrok tiers have been seen to accept the browser login and then reject inference with HTTP 403. That is an xAI entitlement gate, not a stale token. Use `XAI_API_KEY` on the catalog `xai` route in that case.
- Filesystem, shell, skills, MCP, subagents, permissions, attachments, and compaction still come from the active dsh profile.

## Development

```sh
npm install
npm run check
```

A companion Grok skill (`dsh-plugin`) for authoring other DeepSeek Harness plugins is **not** in this repository. Install it from the zip: unzip into `~/.grok/skills/dsh-plugin/`, then run `/dsh-plugin`.

## License

Apache-2.0
