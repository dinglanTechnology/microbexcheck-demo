#!/bin/sh
# 容器启动:先用 db push 对齐数据库结构（与后端开发流程一致），再启动 Next standalone 服务。
# db push 失败不阻塞启动，保证前端页面（/、/workspace）始终可访问。
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "[entrypoint] prisma db push ..."
  ./node_modules/.bin/prisma db push || echo "[entrypoint] db push 失败，跳过，继续启动服务"
else
  echo "[entrypoint] 未设置 DATABASE_URL，跳过 db push"
fi

echo "[entrypoint] starting server ..."
exec node server.js
