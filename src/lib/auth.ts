// src/lib/auth.ts
// Shared-secret bearer token auth for single-tenant watch CRUD endpoints.

import { timingSafeEqual } from 'crypto'
import { env } from '@/lib/env'
import type { NextRequest } from 'next/server'

// Returns true if the request carries the correct WATCHES_API_KEY bearer token.
export function isAuthorized(req: NextRequest): boolean {
  const header = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${env.WATCHES_API_KEY}`
  try {
    return timingSafeEqual(
      Buffer.from(header),
      Buffer.from(expected)
    )
  } catch {
    // timingSafeEqual throws if buffers differ in length — that means not equal
    return false
  }
}
