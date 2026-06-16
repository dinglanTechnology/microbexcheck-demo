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
    RUN npx prisma generate && npm run build
    
    # ---- 运行 ----
    FROM node:22-alpine AS runner
    RUN apk add --no-cache openssl
    WORKDIR /app
    ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
    
    COPY --from=builder /app/public ./public
    COPY --from=builder /app/.next/standalone ./
    COPY --from=builder /app/.next/static ./.next/static
    
    EXPOSE 3000
    CMD ["node", "server.js"]