// src/app/api/snapshots/route.ts
// GET /api/snapshots?refId=<uuid>&refType=listing|job

import { NextRequest, NextResponse } from 'next/server'
import { SnapshotsQuerySchema } from '@/lib/schemas'
import { getSnapshotsByRef } from '@/db/queries/snapshots'
import { getSearchRatelimit, getIp } from '@/lib/ratelimit'

export const maxDuration = 15

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = getIp(req)
    const { success } = await getSearchRatelimit().limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const params = Object.fromEntries(req.nextUrl.searchParams.entries())
    const parsed = SnapshotsQuerySchema.safeParse(params)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', issues: parsed.error.issues.map(i => ({ path: i.path, message: i.message })) },
        { status: 400 }
      )
    }

    const { refId, refType } = parsed.data
    const snapshots = await getSnapshotsByRef(refId, refType)

    return NextResponse.json({ data: snapshots })
  } catch (err) {
    console.error('[GET /api/snapshots] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
