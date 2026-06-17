# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> ⚠️ 见上面的 AGENTS.md：本仓库的 Next.js（16.x）有破坏性变更，写任何代码前先读 `node_modules/next/dist/docs/` 对应章节，不要凭训练记忆套用旧 API。

## 命令

```bash
npx prisma generate     # 必须先跑：Prisma client 生成到 app/generated/prisma（被 .gitignore），新克隆/拉取后不跑会编译失败
npm run dev             # 开发服务器
npm run build           # 生产构建（output: standalone）
npm run lint            # eslint
npx prisma db push      # 把 schema 同步到 .env 里 DATABASE_URL 指向的库（本项目的建表方式，破坏性，先确认再跑）
```

- **没有测试框架**，`lint` 即唯一静态检查。
- **`next dev` 实际监听端口由 `.env` 的 `PORT` 决定（=3000），`-p` 标志会被它覆盖**——别困惑于为什么 `-p 3210` 不生效。
- 构建前若 `app/generated/prisma` 不存在，先 `npx prisma generate`（`next build` 不会自动生成）。

## 架构

### 路由与「页面其实是静态 HTML」
- 用户可见的两个页面是 **`public/` 下的纯原生 JS 静态 HTML**，不是 React：
  - `/` → `public/landing.html`（官网落地页，含 Three.js 背景）
  - `/workspace` → `public/workspace.html`（文献审核工作台；原型为 IPSC.html，原始文件未入库）
  - 映射在 `next.config.ts` 的 `rewrites()` 里（数组形式，filesystem 之后生效）。**改这两个页面就直接编辑对应 `.html`**，不要去找 React 组件。
  - `workspace.html` 的 UI 状态用 `localStorage` 持久化（如 `mc_current_paper` 选中文献、`mc_left_open` 列表栏开合）。
- **`app/` 实际只承载 API**（App Router route handlers）。`app/strain-review/*` 是一份**未接入路由的 React 原型，属于死代码**，不要误以为它是线上工作台。

### 后端数据流
`workspace.html` ⇄ `/api/papers*` ⇄ Prisma/MySQL，中间经 `lib/ipsc/*` 做结构转换：
- `lib/ipsc/sections.ts` — 文献审核字段的规范 schema（section id / field key / 类型 / 单选项），**必须与 `public/workspace.html` 里前端的 `SECTIONS` 定义保持一致**，否则前端拿不到预期形状。
- `lib/ipsc/transform.ts` / `assemble.ts` — 把数据库里的抽取结果转成「按 rid 组织、中文键、含 AI/杨/王 三来源」的字段记录，再 `buildSections` 拼成详情响应。
- `lib/oss.ts`（ali-oss）— PDF 存在阿里云 OSS；`workspace.html` 先尝试直连 OSS 直链（需 OSS 配 CORS），失败回退到同源代理 `/api/papers/:id/pdf`（按 Range 取页）。
- `lib/prisma.ts` — PrismaClient 单例，用 `@prisma/adapter-mariadb` 驱动适配器（纯 JS，无原生 query engine 二进制）。`lib/http.ts` 统一错误响应，`lib/validators/field.ts` 用 zod 校验编辑请求。

### API 一览
- `GET  /api/papers` — 列表
- `GET  /api/papers/:id` — 详情（含 sections + 三来源，经 `buildSections`）
- `PATCH /api/papers/:id/fields` — 持久化字段编辑 / 确认状态 / 定位坐标
- `GET  /api/papers/:id/pdf` — OSS PDF 同源代理（透传 Range）

### Prisma 配置的特殊点
- `prisma/schema.prisma` 的 `datasource` **没有 `url`**；URL 由 `prisma.config.ts` 从 `process.env.DATABASE_URL` 注入（该文件 `import "dotenv/config"`，所以 `dotenv` 是必需依赖）。
- generator `prisma-client` 输出到 `app/generated/prisma`（gitignore），导入路径形如 `@/app/generated/prisma/client`。
- 库工作流是 `prisma db push`（不是 migrate deploy）；`prisma/migrations/` 目录存在但开发期用 push。

## 部署
- `Dockerfile`：多阶段，`output: standalone`；运行时镜像额外隔离安装 prisma CLI + dotenv，`docker-entrypoint.sh` 启动时先 `prisma db push` 再 `node server.js`（无 `DATABASE_URL` 则跳过、不阻塞前端）。`DATABASE_URL` 等密钥运行时注入（`--env-file`），不打进镜像。
- `.github/workflows/build.yml`：手动触发，构建并推送镜像到阿里云仓库，再通知 Jenkins 部署。

## 注意
- `next.config.ts` 开启了 `typescript.ignoreBuildErrors` 与 `reactStrictMode:false`——`next build` 会跳过类型检查，需要类型校验请单独跑 `npx tsc --noEmit`。
- 这个目录可能有协作者并行改动（后端 API / CI / Docker 等会不时出现新文件或新提交）；推送前先 `git fetch` 看是否落后远程。
