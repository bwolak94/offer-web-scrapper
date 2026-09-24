// drizzle.config.ts
// IMPORTANT: uses DATABASE_URL_UNPOOLED (direct Neon connection), never DATABASE_URL.
// Neon's PgBouncer pooler runs in transaction pooling mode and does not support the
// binary protocol drizzle-kit uses for DDL — migrations fail silently or with obscure
// errors when run against the pooled URL. (PLAN_REVIEW Issue 5.7)
import type { Config } from 'drizzle-kit'

export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  verbose: true,
  strict: true,
} satisfies Config
