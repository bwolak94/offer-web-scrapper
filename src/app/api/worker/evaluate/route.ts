import { verifySignatureAppRouter } from '@upstash/qstash/nextjs'
import { z } from 'zod'
import { checkAfterScoring } from '@/pipeline/watch-evaluator'

export const maxDuration = 300

const EvaluatePayloadSchema = z.object({
  refId:   z.string().uuid(),
  refType: z.enum(['listing', 'job']),
  score:   z.number().int().min(0).max(100),
})

async function handler(request: Request): Promise<Response> {
  const rawBody = await request.text()
  let payload: unknown
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return Response.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Invalid JSON' } },
      { status: 400 }
    )
  }

  const parsed = EvaluatePayloadSchema.safeParse(payload)
  if (!parsed.success) {
    return Response.json(
      {
        error: {
          code:   'VALIDATION_ERROR',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
        },
      },
      { status: 400 }
    )
  }

  const { refId, refType, score } = parsed.data

  // checkAfterScoring never throws — it wraps everything in try/catch internally
  await checkAfterScoring(refId, refType, score)

  return Response.json({ refId, refType, evaluated: true })
}

// Defer verifySignatureAppRouter(handler) to request time so the QStash SDK does not
// read QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY at module evaluation
// (which runs during `next build` when env vars are not yet available).
export function POST(request: Request): Promise<Response> {
  return verifySignatureAppRouter(handler)(request)
}
