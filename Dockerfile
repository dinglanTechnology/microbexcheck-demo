# ---- 依赖 ----
FROM node:22-alpine AS deps
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# ---- 构建 ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# 构建期不连数据库，仅给一个占位 URL，避免模块加载时拿到空值；动态 API 不会在构建时执行。
ENV DATABASE_URL="mysql://placeholder:placeholder@localhost:3306/placeholder"
RUN npx prisma generate && npm run build

# ---- 运行时迁移所需的 Prisma CLI（隔离安装，避免污染 standalone 的精简 node_modules）----
FROM node:22-alpine AS prismacli
WORKDIR /pcli
RUN npm install --no-save --no-package-lock prisma@7.8.0 dotenv@^17

# ---- 运行 ----
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0

# Next standalone 产物（自带精简后的 node_modules）
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public

# 运行时 prisma db push 需要：schema、prisma.config.ts，以及 CLI/dotenv
# 把隔离安装的 prisma CLI 合并进 standalone 的 node_modules（仅新增 prisma+dotenv 及其依赖）
COPY --from=builder --chown=node:node /app/prisma ./prisma
COPY --from=builder --chown=node:node /app/prisma.config.ts ./prisma.config.ts
COPY --from=prismacli --chown=node:node /pcli/node_modules ./node_modules

COPY --chown=node:node docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

USER node
EXPOSE 3000
CMD ["./docker-entrypoint.sh"]
