// src/app/api/listings/[id]/route.ts
// GET /api/listings/:id — returns a single listing (no embedding)

import { NextRequest, NextResponse } from 'next/server'
import { getListingByIdPublic } from '@/db/queries/listings'
import { checkSearchLimit, getIp } from '@/lib/ratelimit'

export const maxDuration = 15

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const ip = getIp(req)
    const { success } = await checkSearchLimit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const { id } = await params

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
    }

    const listing = await getListingByIdPublic(id)

    if (!listing) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ data: listing })
  } catch (err) {
    console.error('[GET /api/listings/[id]] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
