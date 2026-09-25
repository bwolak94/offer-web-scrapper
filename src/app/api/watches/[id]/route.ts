// src/app/api/watches/[id]/route.ts
// GET    /api/watches/:id  — get a single watch
// PATCH  /api/watches/:id  — update a watch (rate limited)
// DELETE /api/watches/:id  — delete a watch (rate limited)

import { NextRequest, NextResponse } from 'next/server'
import { WatchUpdateSchema } from '@/lib/schemas'
import { getWatchById, updateWatch, deleteWatch } from '@/db/queries/watches'
import { getWatchesRatelimit, getIp } from '@/lib/ratelimit'
import { generateEmbedding } from '@/ai/embeddings'
import { AITask } from '@/ai/client'

export const maxDuration = 30

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
    }

    const watch = await getWatchById(id)
    if (!watch) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ data: watch })
  } catch (err) {
    console.error('[GET /api/watches/[id]] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const ip = getIp(req)
    const { success } = await getWatchesRatelimit().limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const { id } = await params

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
    }

    const parsed = WatchUpdateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 422 }
      )
    }

    const { criteria, filters, minScore, notifyEmail, notifyWebhook, active } = parsed.data

    const updateData: Record<string, unknown> = {}

    if (filters !== undefined)       updateData.filters        = filters
    if (minScore !== undefined)      updateData.min_score      = minScore
    if (active !== undefined)        updateData.active         = active
    if (notifyEmail !== undefined)   updateData.notify_email   = notifyEmail
    if (notifyWebhook !== undefined) updateData.notify_webhook = notifyWebhook

    if (criteria !== undefined) {
      updateData.criteria = criteria
      const embedding = await generateEmbedding(criteria, AITask.EMBED_CRITERIA)
      updateData.criteria_embedding = embedding
    }

    const updated = await updateWatch(id, updateData as Parameters<typeof updateWatch>[1])
    if (!updated) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return NextResponse.json({ data: updated })
  } catch (err) {
    console.error('[PATCH /api/watches/[id]] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const ip = getIp(req)
    const { success } = await getWatchesRatelimit().limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    const { id } = await params

    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'INVALID_ID' }, { status: 400 })
    }

    const deleted = await deleteWatch(id)
    if (!deleted) {
      return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    }

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error('[DELETE /api/watches/[id]] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
