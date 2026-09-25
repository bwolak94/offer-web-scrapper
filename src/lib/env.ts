// src/lib/env.ts
// Imported by src/db/index.ts — executed once when the server module is first loaded.
// Do NOT import this in Client Components — all vars listed here are secret.

const REQUIRED_SERVER_VARS = [
  'DATABASE_URL',
  'DATABASE_URL_UNPOOLED',
  'QSTASH_TOKEN',
  'QSTASH_CURRENT_SIGNING_KEY',
  'QSTASH_NEXT_SIGNING_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'HUGGINGFACE_API_KEY',
  'GROQ_API_KEY',
  'CRON_SECRET',
  'RESEND_API_KEY',
  'RESEND_FROM_EMAIL',
  // BROWSERLESS_URL and BROWSERLESS_TOKEN are validated lazily inside the Browserless
  // scraper — not required at startup until BE-05/BE-06 scrapers are deployed.
] as const

// Only validate at runtime — skip during Next.js build phase, Edge runtime, client bundles,
// and tests. NEXT_PHASE=phase-production-build is set by Next.js during `next build`.
if (
  typeof process !== 'undefined' &&
  process.env.NODE_ENV !== 'test' &&
  process.env.NEXT_PHASE !== 'phase-production-build'
) {
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
  QSTASH_TOKEN:                    process.env.QSTASH_TOKEN!,
  QSTASH_CURRENT_SIGNING_KEY:      process.env.QSTASH_CURRENT_SIGNING_KEY!,
  QSTASH_NEXT_SIGNING_KEY:         process.env.QSTASH_NEXT_SIGNING_KEY!,
  UPSTASH_REDIS_REST_URL:          process.env.UPSTASH_REDIS_REST_URL!,
  UPSTASH_REDIS_REST_TOKEN:        process.env.UPSTASH_REDIS_REST_TOKEN!,
  HUGGINGFACE_API_KEY:             process.env.HUGGINGFACE_API_KEY!,
  GROQ_API_KEY:                    process.env.GROQ_API_KEY!,
  CRON_SECRET:                     process.env.CRON_SECRET!,
  RESEND_API_KEY:                  process.env.RESEND_API_KEY!,
  RESEND_FROM_EMAIL:               process.env.RESEND_FROM_EMAIL!,
  // Validated lazily in scraper — not required at startup until BE-05/BE-06
  BROWSERLESS_URL:                 process.env.BROWSERLESS_URL,
  BROWSERLESS_TOKEN:               process.env.BROWSERLESS_TOKEN,
  NEXT_PUBLIC_APP_URL:             process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
} as const
