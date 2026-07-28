import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations MUST use a direct (unpooled) connection. Prisma acquires a
    // session-level advisory lock to serialize migrations, and Neon's pooled
    // endpoint (PgBouncer, transaction mode) cannot hold that lock across
    // statements -> `prisma migrate deploy` fails with P1002 (advisory-lock
    // timeout). `DATABASE_URL_UNPOOLED` is the direct endpoint the Neon-Vercel
    // integration provisions. Runtime app queries still use the pooled
    // `DATABASE_URL` via the driver adapter in `db.ts`.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
