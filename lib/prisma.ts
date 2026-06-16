import { PrismaMariaDb } from "@prisma/adapter-mariadb";
// Prisma 7's `prisma-client` generator emits to `output` — the `/client`
// suffix is required. Next.js loads `.env` automatically, so no dotenv here.
import { PrismaClient } from "@/app/generated/prisma/client";

const adapter = new PrismaMariaDb(process.env.DATABASE_URL as string);

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

// Reuse a single client across hot-reloads in dev to avoid exhausting the
// MySQL connection pool.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
