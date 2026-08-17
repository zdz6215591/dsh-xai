# Official DeepSeek Harness pages

Canonical English tree: `https://deepseek-harness.github.io/deepseek-harness/en/`.  
Chinese twin: drop `/en/` (example: `/develop/basic/` ↔ `/en/develop/basic/`).

Fetch the page you need. Do not quote stale `/guide/first-plugin` or `/guide/publish` URLs.

| When | Page |
| --- | --- |
| What a plugin is (`apply`, `inject`, `ctx.effect`, three forms) | [Your first plugin](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/) |
| `Config` + Schemastery + HMR | [Plugin configuration](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/config) |
| Bundle vs profile, layer order, git `prepare` / `allowBuilds` | [Package and install a plugin](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/publish) |
| Tool DSL | [Build a tool](https://deepseek-harness.github.io/deepseek-harness/en/develop/basic/tool) |
| New LLM route, `StreamChunk`, `LlmError`, `registerAdapter` | [LLM adapters](https://deepseek-harness.github.io/deepseek-harness/en/develop/practice/llm-adapter) |
| Seams, layer stack, “where new behavior goes” | [Architecture](https://deepseek-harness.github.io/deepseek-harness/en/reference/) |
| `ctx.webServer` routes, no TLS/auth | [HTTP server](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/web-server) |
| `dsh.client` scan / boot manifest | [Client modules](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/client-modules) |
| Every settable `config:` field | [Config catalog](https://deepseek-harness.github.io/deepseek-harness/en/reference/config-catalog) |
| User-facing model picker | [Configure models](https://deepseek-harness.github.io/deepseek-harness/en/guide/providers) |
| Run-from-source / `pnpm dsh` | [deepseek-ai/deepseek-harness README](https://github.com/deepseek-ai/deepseek-harness/blob/master/README.md) |
| Exact CLI layer flags | [apps/cli/reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md) |
| Self-contained git `prepare` example | [turtle-ui](https://github.com/deepseek-harness/turtle-ui) |
| Shipped adapter to copy contracts from | [packages/llm/llm-pi-ai](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-pi-ai/README.md), [packages/llm/llm-deepseek](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/llm/llm-deepseek/README.md) |

`$DSH_HOME` defaults to `~/.dsh`. Profiles live in `$DSH_HOME/profiles/<name>` (`web` and `headless` are templates). Dump the composed tree with:

```sh
dsh --profile web --dump-config
```
