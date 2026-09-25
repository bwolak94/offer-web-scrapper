import { createHash } from 'crypto'
import { z } from 'zod'
import { getGroqClient } from './client'
import { getScoreCache, setScoreCache } from '@/db/queries/score-cache'
import type { ScoringContext } from '@/types'

const SCORING_MODEL = process.env.SCORING_MODEL ?? 'llama-3.1-8b-instant'

const ScoreResponseSchema = z.object({
  score:  z.number().int().min(0).max(100),
  reason: z.string().optional(),
})

// Normalize criteria text before hashing so cosmetic whitespace/case differences
// don't produce separate cache entries for semantically identical criteria.
function normalizeCriteria(criteria: string): string {
  return criteria.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function buildScorerCriteriaHash(criteria: string): string {
  return createHash('sha256').update(normalizeCriteria(criteria)).digest('hex')
}

function buildListingUserMessage(ctx: ScoringContext, criteria: string): string {
  const lines: string[] = [
    `Title: ${ctx.title}`,
    ctx.location ? `Location: ${ctx.location}` : null,
    ctx.price != null ? `Price: ${ctx.price}${ctx.currency ? ` ${ctx.currency}` : ''}` : null,
    ctx.pricePerM2 != null ? `Price per m2: ${ctx.pricePerM2}` : null,
    ctx.areaM2 != null ? `Area: ${ctx.areaM2} m2` : null,
    ctx.rooms != null ? `Rooms: ${ctx.rooms}` : null,
    ctx.description ? `Description: ${ctx.description.slice(0, 500)}` : null,
    ``,
    `Criteria: ${criteria.slice(0, 500)}`,
  ].filter((l): l is string => l !== null)

  return lines.join('\n')
}

function buildJobUserMessage(ctx: ScoringContext, criteria: string): string {
  const lines: string[] = [
    `Title: ${ctx.title}`,
    ctx.location ? `Location: ${ctx.location}` : null,
    ctx.remote != null ? `Remote: ${ctx.remote ? 'yes' : 'no'}` : null,
    ctx.salaryMin != null || ctx.salaryMax != null
      ? `Salary: ${ctx.salaryMin ?? '?'} – ${ctx.salaryMax ?? '?'}${ctx.currency ? ` ${ctx.currency}` : ''}`
      : null,
    ctx.employmentType ? `Employment type: ${ctx.employmentType}` : null,
    ctx.techStack?.length ? `Tech stack: ${ctx.techStack.join(', ')}` : null,
    ctx.description ? `Description: ${ctx.description.slice(0, 500)}` : null,
    ``,
    `Criteria: ${criteria.slice(0, 500)}`,
  ].filter((l): l is string => l !== null)

  return lines.join('\n')
}

const SYSTEM_PROMPT = `You are an offer evaluator. Given an offer and user criteria, score how well the offer matches on a scale of 0–100.
Respond with a JSON object containing "score" (integer 0–100) and optionally "reason" (one short sentence).
Example: {"score": 82, "reason": "Strong match on location and price range."}`

export async function scoreItem(
  ctx:      ScoringContext,
  criteria: string
): Promise<{ score: number; reason: string | null }> {
  const criteriaHash = buildScorerCriteriaHash(criteria)

  const cached = await getScoreCache(ctx.id, ctx.type, criteriaHash)
  if (cached) return cached

  const userMessage = ctx.type === 'listing'
    ? buildListingUserMessage(ctx, criteria)
    : buildJobUserMessage(ctx, criteria)

  const groq = getGroqClient()

  let rawContent: string
  try {
    const completion = await groq.chat.completions.create({
      model:           SCORING_MODEL,
      max_tokens:      120,
      temperature:     0.0,
      seed:            42,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: userMessage },
      ],
    })
    rawContent = completion.choices[0]?.message?.content ?? ''
  } catch (err) {
    // Network/API errors (429, 503, timeouts) — bubble up so the caller can retry
    throw err
  }

  let score: number
  let reason: string | null

  try {
    const parsed = ScoreResponseSchema.parse(JSON.parse(rawContent))
    score  = parsed.score
    reason = parsed.reason ?? null
  } catch (parseErr) {
    console.error('[scorer] Failed to parse score response', { rawSnippet: rawContent.slice(0, 200), err: parseErr })
    return { score: 50, reason: null }
  }

  await setScoreCache({
    refId:        ctx.id,
    refType:      ctx.type,
    criteriaHash,
    model:        SCORING_MODEL,
    score,
    reason:       reason ?? undefined,
  })

  return { score, reason }
}
