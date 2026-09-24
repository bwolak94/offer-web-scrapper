// src/lib/env.ts
// Imported by src/db/index.ts — executed once when the server module is first loaded.
// Do NOT import this in Client Components — all vars listed here are secret.

const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'OLLAMA_BASE_URL',
  'OLLAMA_EMBED_MODEL',
  'GROQ_API_KEY',
  'CRON_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  'BROWSERLESS_URL',
  'BROWSERLESS_TOKEN',
] as const

// Only validate in Node.js runtime (skip during Next.js Edge runtime or client bundles)
if (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test') {
  const missing = REQUIRED_SERVER_VARS.filter((key) => !process.env[key])
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      'Check .env.local or the Vercel/GitHub project settings.'
    )
  }
}

export const env = {
  DATABASE_URL:                    process.env.DATABASE_URL!,
  DATABASE_URL_UNPOOLED:           process.env.DATABASE_URL_UNPOOLED!,
  QSTASH_CURRENT_SIGNING_KEY:      process.env.QSTASH_CURRENT_SIGNING_KEY!,
  QSTASH_NEXT_SIGNING_KEY:         process.env.QSTASH_NEXT_SIGNING_KEY!,
  UPSTASH_REDIS_REST_URL:          process.env.UPSTASH_REDIS_REST_URL!,
  UPSTASH_REDIS_REST_TOKEN:        process.env.UPSTASH_REDIS_REST_TOKEN!,
  OLLAMA_BASE_URL:                 process.env.OLLAMA_BASE_URL!,
  OLLAMA_EMBED_MODEL:              process.env.OLLAMA_EMBED_MODEL!,
  GROQ_API_KEY:                    process.env.GROQ_API_KEY!,
  CRON_SECRET:                     process.env.CRON_SECRET!,
  RESEND_API_KEY:                  process.env.RESEND_API_KEY!,
  RESEND_FROM_EMAIL:               process.env.RESEND_FROM_EMAIL!,
  BROWSERLESS_URL:                 process.env.BROWSERLESS_URL!,
  BROWSERLESS_TOKEN:               process.env.BROWSERLESS_TOKEN!,
  NEXT_PUBLIC_APP_URL:             process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const
