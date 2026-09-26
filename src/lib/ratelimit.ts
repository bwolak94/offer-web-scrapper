// src/lib/ratelimit.ts
// Lazy-initialised Upstash rate limiters.
// Do NOT instantiate Redis at module load time — env vars are not available
// during Next.js build phase and would cause build failures.

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import type { NextRequest } from 'next/server'

// ─── No-op result returned in dev when Upstash is not configured ──────────────

const RATELIMIT_SKIP = { success: true, limit: 0, remaining: 0, reset: 0 } as const

function isUpstashConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN)
}

// ─── Lazy Redis singleton ─────────────────────────────────────────────────────

let _redis: Redis | null = null

function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis({
      url:   process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  }
  return _redis
}

// ─── Lazy rate limiter factories ──────────────────────────────────────────────

let _searchRatelimit: Ratelimit | null = null
let _scoreRatelimit:  Ratelimit | null = null
let _watchesRatelimit: Ratelimit | null = null

function getSearchRatelimit(): Ratelimit {
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

function getScoreRatelimit(): Ratelimit {
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

function getWatchesRatelimit(): Ratelimit {
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

// ─── Public API — skips Redis when Upstash is not configured ─────────────────

type RatelimitResult = { success: boolean; limit: number; remaining: number; reset: number }

export async function checkSearchLimit(ip: string): Promise<RatelimitResult> {
  if (!isUpstashConfigured()) return RATELIMIT_SKIP
  return getSearchRatelimit().limit(ip)
}

export async function checkScoreLimit(ip: string): Promise<RatelimitResult> {
  if (!isUpstashConfigured()) return RATELIMIT_SKIP
  return getScoreRatelimit().limit(ip)
}

export async function checkWatchesLimit(ip: string): Promise<RatelimitResult> {
  if (!isUpstashConfigured()) return RATELIMIT_SKIP
  return getWatchesRatelimit().limit(ip)
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
