// src/app/api/watches/route.ts
// GET  /api/watches  — list all active watches
// POST /api/watches  — create a new watch (rate limited)

import { NextRequest, NextResponse } from 'next/server'
import { WatchCreateSchema } from '@/lib/schemas'
import { createWatch, listWatches } from '@/db/queries/watches'
import { getWatchesRatelimit, getIp } from '@/lib/ratelimit'
import { generateEmbedding } from '@/ai/embeddings'
import { AITask } from '@/ai/client'
import type { WatchType } from '@/types'

export const maxDuration = 30

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get('type') as WatchType | null

    const watches = await listWatches(typeParam ?? undefined)
    return NextResponse.json({ data: watches })
  } catch (err) {
    console.error('[GET /api/watches] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const ip = getIp(req)
    const { success } = await getWatchesRatelimit().limit(ip)
    if (!success) {
      return NextResponse.json({ error: 'RATE_LIMITED' }, { status: 429 })
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'INVALID_JSON' }, { status: 400 })
    }

    const parsed = WatchCreateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
        { status: 422 }
      )
    }

    const { type, filters, criteria, minScore, notifyEmail, notifyWebhook } = parsed.data

    let criteriaEmbedding: number[] | null = null
    if (criteria) {
      criteriaEmbedding = await generateEmbedding(criteria, AITask.EMBED_CRITERIA)
    }

    const watch = await createWatch({
      type,
      filters,
      criteria:           criteria ?? null,
      criteria_embedding: criteriaEmbedding,
      min_score:          minScore ?? 70,
      notify_email:       notifyEmail ?? null,
      notify_webhook:     notifyWebhook ?? null,
      active:             true,
    })

    return NextResponse.json({ data: watch }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/watches] Unexpected error', err)
    return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
  }
}
