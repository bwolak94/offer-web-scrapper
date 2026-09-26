// src/app/api/jobs/[id]/route.ts
// GET /api/jobs/:id — returns a single job (no embedding)

import { NextRequest, NextResponse } from 'next/server'
import { getJobByIdPublic } from '@/db/queries/jobs'
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

    const job = await getJobByIdPublic(id)

    if (!job) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ data: job })
  } catch (err) {
    console.error('[GET /api/jobs/[id]] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
