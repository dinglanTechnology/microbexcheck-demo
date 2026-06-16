import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// Prisma 7's `prisma-client` generator emits to `output` — the `/client`
// suffix is required. Next.js loads `.env` automatically, so no dotenv here.
import { PrismaClient } from "@/app/generated/prisma/client";

// The mariadb driver rejects the `mysql://` scheme that Prisma's migration
// engine requires, so parse DATABASE_URL into an explicit pool config.
function poolConfig() {
  const u = new URL(process.env.DATABASE_URL as string);
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : 3306,
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: decodeURIComponent(u.pathname.replace(/^\//, "")),
    connectionLimit: 5,
  };
}

const adapter = new PrismaMariaDb(poolConfig());

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Reuse a single client across hot-reloads in dev to avoid exhausting the
// connection pool.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
