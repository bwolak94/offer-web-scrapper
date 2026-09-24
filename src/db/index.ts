import { neon } from '@neondatabase/serverless'
import { drizzle } from 'drizzle-orm/neon-http'
import * as schema from './schema'

// HTTP driver — stateless, best for single queries in Vercel serverless.
// Uses DATABASE_URL (pooled Neon connection via PgBouncer).
// Only DATABASE_URL_UNPOOLED is used for migrations (drizzle-kit).
const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })

// WebSocket driver — use only when you need transactions.
// Instantiate per-request, not at module level (new Pool() each time).
import { Pool } from '@neondatabase/serverless'
import { drizzle as drizzleWs } from 'drizzle-orm/neon-serverless'

export function getDbWithPool() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL! })
  return drizzleWs(pool, { schema })
}

// Re-export schema tables and inferred types for convenience
export * from './schema'
