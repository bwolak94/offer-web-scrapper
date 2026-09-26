import { timingSafeEqual } from 'crypto'
import { Client as QStashClient } from '@upstash/qstash'
import { env } from '@/lib/env'

export const maxDuration = 10

const REAL_ESTATE_TASKS = [
  { source: 'otodom',  category: 'sale' },
  { source: 'otodom',  category: 'rent_long' },
  { source: 'olx',     category: 'sale' },
  { source: 'olx',     category: 'rent_long' },
  { source: 'olx',     category: 'rent_short' },
  { source: 'morizon', category: 'sale' },
  { source: 'morizon', category: 'rent_long' },
  { source: 'gratka',  category: 'sale' },
] as const

function isValidCronSecret(authHeader: string | null): boolean {
  if (!authHeader) return false
  const expected = `Bearer ${env.CRON_SECRET}`
  try {
    // Constant-time comparison to prevent timing attacks
    return timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected))
  } catch {
    // Buffer lengths differ — definitely not equal
    return false
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!isValidCronSecret(request.headers.get('authorization'))) {
    return Response.json(
      { error: { code: 'UNAUTHORIZED', message: 'Invalid cron secret' } },
      { status: 401 }
    )
  }

  const qstash    = new QStashClient({ token: env.QSTASH_TOKEN })
  const workerUrl = `${env.NEXT_PUBLIC_APP_URL}/api/worker/scrape`

  const results = await Promise.allSettled(
    REAL_ESTATE_TASKS.map((task) =>
      qstash.publishJSON({ url: workerUrl, body: task, retries: 3 })
    )
  )

  const queued = REAL_ESTATE_TASKS.filter((_, i) => results[i]?.status === 'fulfilled')
  const failed = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected')
  if (failed.length > 0) {
    // Log only the message to avoid leaking raw QStash response payloads
    console.error('[scrape/real-estate] Failed to enqueue tasks:', failed.map((r) => r.reason?.message ?? String(r.reason)))
  }

  return Response.json({ queued, count: queued.length })
}

// Allow manual POST triggers for testing without 405 errors
export { GET as POST }
