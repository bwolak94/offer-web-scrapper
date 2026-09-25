// src/lib/ratelimit.ts
// Lazy-initialised Upstash rate limiters.
// Do NOT instantiate Redis at module load time — env vars are not available
// during Next.js build phase and would cause build failures.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { env } from '@/lib/env'
import type { NextRequest } from 'next/server'

// ─── Lazy Redis singleton ─────────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   env.UPSTASH_REDIS_REST_URL,
      token: env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return _redis
}

// ─── Lazy rate limiter factories ──────────────────────────────────────────────

let _searchRatelimit: Ratelimit | null = null
let _scoreRatelimit:  Ratelimit | null = null
let _watchesRatelimit: Ratelimit | null = null

export function getSearchRatelimit(): Ratelimit {
  if (!_searchRatelimit) {
    _searchRatelimit = new Ratelimit({
      redis:     getRedis(),
      limiter:   Ratelimit.slidingWindow(20, '10 s'),
      prefix:    'rl:search',
      analytics: false,
    })
  }
  return _searchRatelimit
}

export function getScoreRatelimit(): Ratelimit {
  if (!_scoreRatelimit) {
    _scoreRatelimit = new Ratelimit({
      redis:     getRedis(),
      limiter:   Ratelimit.slidingWindow(5, '60 s'),
      prefix:    'rl:score',
      analytics: false,
    })
  }
  return _scoreRatelimit
}

export function getWatchesRatelimit(): Ratelimit {
  if (!_watchesRatelimit) {
    _watchesRatelimit = new Ratelimit({
      redis:     getRedis(),
      limiter:   Ratelimit.slidingWindow(10, '60 s'),
      prefix:    'rl:watches',
      analytics: false,
    })
  }
  return _watchesRatelimit
}

// ─── IP extraction helper ─────────────────────────────────────────────────────

export function getIp(req: NextRequest): string {
  // On Vercel, x-vercel-forwarded-for is set by Vercel's edge and cannot be
  // spoofed by the client — always prefer it over x-forwarded-for.
  // Split on comma in case of multi-region routing returning multiple IPs.
  const vercelIp = req.headers.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.split(',')[0]!.trim()

  // Fallback: use the LAST entry (appended by our trusted proxy),
  // not the first (which a client controls).
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const parts = forwarded.split(',')
    const last  = parts[parts.length - 1]
    if (last) return last.trim()
  }
  return 'anonymous'
}
