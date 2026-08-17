---
name: dsh-plugin
description: >
  Author, review, debug, or package a DeepSeek Harness (dsh / Cordis) plugin
  or installable bundle. Covers apply/inject, dsh.bundle vs dsh.profile,
  cordis.patch.yml layer order, settings slots, client modules, LLM adapters,
  host HTTP trust, credentials, and git install. Use when the user wants to
  write or fix a dsh plugin, 写 dsh 插件, 第一个插件, dsh.bundle,
  cordis.patch.yml, settings.section, LLM adapter, or runs /dsh-plugin.
when-to-use: >
  dsh plugin, DeepSeek Harness plugin, 写插件, 审插件, first plugin,
  dsh.bundle, cordis.patch.yml, settings.section, xai-oauth, /dsh-plugin
argument-hint: write | review | debug-install | package
license: Apache-2.0
compatibility: Requires the dsh CLI or a DeepSeek Harness source checkout; official docs at https://deepseek-harness.github.io/deepseek-harness/en/
metadata:
  author: zdz6215591
  short-description: Build and review DeepSeek Harness plugins
---

# DeepSeek Harness 插件

按本 skill 写、审、修、打包或排查 dsh 插件。先核对现行官方文档，再套用 [references/pitfalls.md](references/pitfalls.md)。不要凭记忆发明 Cordis / dsh API，也不要去改 `deepseek-harness` 源码来“打补丁”——官方合同是在旁边再挂一个插件。

本仓库 `dsh-xai` 只是一份完整样例（OAuth LLM 路由 + Settings 卡片 + CLI）。把其中的**机制**复用到新插件；不要把 xAI host 列表、client id、模型 id 抄进无关项目。

## 1. 判定任务

| 用户要做什么 | 走哪条路径 |
| --- | --- |
| 从零做一个插件 | §写新插件 |
| 检查已有插件有没有洞 / 会不会装坏 | §审现有插件 |
| 装不上、设置页崩、登录 fetch failed、模型不全 | §排查 |
| 做成别人能 `dsh plugin add` 的包 | §打包 |

用 `web_fetch` 打开 [references/official-map.md](references/official-map.md) 里对应页的**现行正文**。文档目录已经从 `/guide/` 迁到 `/develop/` 与 `/reference/`，不要沿用过期 URL。

## 2. 写新插件

1. **选缝，不要选分叉。** 对照架构页的 “Where new behavior goes”：
   - 新模型提供方 → `ctx.llm.registerAdapter`
   - 模型可调用能力 → `ctx.tools.register`
   - 设置 UI → `dsh.client` + slots（不要抢官方 section id）
   - 浏览器 HTTP → `ctx.webServer.register`（自带 trust fence）
   - 可选服务 → `ctx.inject(['webServer'], …)`，不要写进必选 `inject`
2. **最小模块。** 导出 `name`、`apply(ctx)`；消费服务则 `export const inject = ['llm']`（或 `tools` 等）。`Config` 必须是 Schemastery schema，不能是普通对象。需要显式清理的资源用 `ctx.effect(() => disposer)`。
3. **本地先 overlay。** `cordis.yml` 里 `insert` 一行，`name` 用**绝对路径**，`pnpm dsh web --patch ./that.yml`。补丁不改变 loader 的模块解析根。
4. **再收成 bundle。** `package.json` 写 `dsh.bundle.patch`；`cordis.patch.yml` 里 `name` 改成包名（不要相对路径）。用户侧用 `dsh plugin --profile <name> add .` 或 `github:owner/repo`。不要手写 profile 的 `dsh.profile`。
5. **挑新 id。** 新插件行用自己的 `id:`；新 LLM 路由用自己的 provider 字符串（例如 `xai-oauth`），不要占用目录里已有的 `xai` / `deepseek`。不要改 `agent-default-model`。
6. **需要 Web UI 时**同时做 client half：`package.json` 的 `dsh.client` + `exports["./client"]`。设置页插槽规则见 pitfalls「Settings slots」。
7. **验证。** `dsh --profile <name> --dump-config` 必须出现你的 layer；跑 typecheck / 单测；装进 `web` profile 后重启 `dsh web`，用真实 UI 点一遍（空状态、错误状态、已登录状态）。

函数形式够用就不要上 class。只有你要向其他插件提供服务时才用 `Service` 子类。

## 3. 审现有插件

按这个顺序读，缺一项就记一条 finding：

1. `package.json`：`dsh.bundle.patch` 是否存在；`files` 是否包含运行入口和 patch；有没有 `dsh.client` / `exports["./client"]`。
2. `cordis.patch.yml`：是否只 `insert` 自己的行；是否整表替换了别人的 `config`；是否改了 `agent-default-model`。
3. `apply`：必选 `inject` 是否最小；可选服务是否 `ctx.inject`；失败的网络刷新是否会拖垮加载。
4. 若注册了 HTTP：是否有与 `/api` 同姿态的 trust fence、body 上限、不回传 token。
5. 若有凭据：是否独立文件、原子写、owner-only、导入只读、不回落到另一条产品的 key。
6. 若有 client：slot 的 `(name, id)` 是否唯一；有没有去占 `settings.section` 的 `models`。
7. 分发：git 安装是源码不是制品——要么提交 `lib/`，要么自包含 `prepare`（见官方 publish 页）。用户还需要 pnpm 和（若有 prepare）`allowBuilds`。

把每条 finding 写成：现象 → 官方/缝的合同 → 改法。不要只写“建议改进”。

## 4. 排查

先分清是**安装平面**还是**运行平面**：

- `pnpm` 不在 PATH：`dsh plugin add` 本质是进 profile 目录调 pnpm。先 `corepack enable` / 装 pnpm，不要改用 `npm dsh`。
- git add 后插件加载失败、没有 `lib/`：缺 `prepare` 或用户没 `allowBuilds`。
- `list slot "settings.section" already has an entry with id "…"`：换唯一 id，或改用 `settings.action` 再 portal，见 pitfalls。
- 登录弹窗空白 / Connecting 后自动关：先看 trust allowlist 有没有把授权 URL 判死刑，再看 Node `fetch failed`。
- `fetch failed` 且系统开了 Clash 等代理：Node 内置 fetch **不读** `HTTP(S)_PROXY`。PowerShell 能通、Node 不通，就是这个。见 pitfalls「Node 出网」。
- 模型列表停在 SDK 打包那几条：live `GET /v1/models` 失败时回落到安装目录；要用 live ∪ extras，按能力类别过滤，不要写死三两个 id。

查层用 `dsh --profile web --dump-config`。改完插件后对已安装的 profile 跑 `dsh plugin --profile web update <pkg>`，并重启 `dsh web`，否则 client 半边还是旧 bundle。

## 5. 打包与分享

- 分发物是 **bundle**（`dsh.bundle`）。**profile** 是用户机器上的组合，作者不要提交 `~/.dsh/profiles/…`。
- 别人安装：`dsh plugin --profile web add github:owner/repo` 或 `./local-checkout`。
- TypeScript 包二选一：提交构建产物，或提供不依赖 monorepo 的 `prepare`。pnpm ≥10 默认拒跑 git 依赖的 prepare，文档里要写清把包名写入 profile 的 `pnpm-workspace.yaml` → `allowBuilds`。
- 不信任的 prepare 视为“在本机、沙箱外执行作者代码”。README 写明可 pin `github:owner/repo#<sha>`。
- 不要用 bundle 去改用户的默认模型；安装后让用户在 composer / Settings → Models 里选。

## 6. 硬约束

细则只在 [references/pitfalls.md](references/pitfalls.md) 写一次。破下面任何一条就停下来改：

- 只挂公开缝，不 fork dsh，不改 `agent-default-model`。
- 补丁与层序、slot id、HTTP 围栏、凭据隔离、Node 出网、适配器合同：按 pitfalls 对应节执行。
- 登录成功先落盘；live catalog 只能后台刷新。
- 状态 / 诊断 API 不返回 token。
