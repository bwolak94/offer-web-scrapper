import Groq from 'groq-sdk'
import OpenAI from 'openai'

// ---------------------------------------------------------------------------
// AITask — task taxonomy. All AI call sites use one of these; never hardcode
// a model name directly.
// ---------------------------------------------------------------------------

export enum AITask {
  EMBED_LISTING  = 'embed_listing',
  EMBED_JOB      = 'embed_job',
  EMBED_QUERY    = 'embed_query',
  EMBED_CRITERIA = 'embed_criteria',
  SCORE_LISTING  = 'score_listing',
  SCORE_JOB      = 'score_job',
}

// ---------------------------------------------------------------------------
// ModelConfig
// ---------------------------------------------------------------------------

export interface ModelConfig {
  provider:        'groq' | 'huggingface' | 'openrouter'
  model:           string
  maxTokens:       number
  temperature:     number
  responseFormat?: { type: 'json_object' }
  seed?:           number
}

// ---------------------------------------------------------------------------
// Routing table
// ---------------------------------------------------------------------------

const HF_EMBED_MODEL =
  'sentence-transformers/paraphrase-multilingual-mpnet-base-v2'

const ROUTING_TABLE: Record<AITask, ModelConfig> = {
  [AITask.EMBED_LISTING]: {
    provider:    'huggingface',
    model:       HF_EMBED_MODEL,
    maxTokens:   0,
    temperature: 0,
  },
  [AITask.EMBED_JOB]: {
    provider:    'huggingface',
    model:       HF_EMBED_MODEL,
    maxTokens:   0,
    temperature: 0,
  },
  [AITask.EMBED_QUERY]: {
    provider:    'huggingface',
    model:       HF_EMBED_MODEL,
    maxTokens:   0,
    temperature: 0,
  },
  [AITask.EMBED_CRITERIA]: {
    provider:    'huggingface',
    model:       HF_EMBED_MODEL,
    maxTokens:   0,
    temperature: 0,
  },
  [AITask.SCORE_LISTING]: {
    provider:       'groq',
    model:          process.env.SCORING_MODEL ?? 'qwen/qwen3.8-27b',
    maxTokens:      60,
    temperature:    0.0,
    responseFormat: { type: 'json_object' },
    seed:           42,
  },
  [AITask.SCORE_JOB]: {
    provider:       'groq',
    model:          process.env.SCORING_MODEL ?? 'qwen/qwen3.8-27b',
    maxTokens:      60,
    temperature:    0.0,
    responseFormat: { type: 'json_object' },
    seed:           42,
  },
}

// ---------------------------------------------------------------------------
// Groq client (singleton)
// ---------------------------------------------------------------------------

const _groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

export function getGroqClient(): Groq {
  return _groqClient
}

// ---------------------------------------------------------------------------
// OpenRouter fallback client (optional scoring fallback)
// ---------------------------------------------------------------------------

export function createOpenRouterClient(): OpenAI {
  return new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey:  process.env.OPENROUTER_API_KEY ?? '',
    defaultHeaders: {
      'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'https://localhost',
    },
  })
}

// ---------------------------------------------------------------------------
// HuggingFace Inference API helpers
// ---------------------------------------------------------------------------

export const HF_INFERENCE_BASE =
  'https://api-inference.huggingface.co'

export function getHuggingFaceEmbedUrl(model: string): string {
  return `${HF_INFERENCE_BASE}/pipeline/feature-extraction/${model}`
}

export function getHuggingFaceAuthHeader(): string {
  const key = process.env.HUGGINGFACE_API_KEY
  if (!key) {
    throw new Error(
      '[ai-client] HUGGINGFACE_API_KEY is not set. ' +
      'Add it to .env.local and Vercel environment variables.'
    )
  }
  return `Bearer ${key}`
}

// ---------------------------------------------------------------------------
// HuggingFace health check (60s TTL, exported for testability)
// ---------------------------------------------------------------------------

interface HealthEntry {
  healthy:   boolean
  checkedAt: number
}

export const _healthCache = new Map<string, HealthEntry>()
const HEALTH_TTL_MS = 60_000

export async function isHuggingFaceHealthy(): Promise<boolean> {
  const url    = HF_INFERENCE_BASE
  const cached = _healthCache.get(url)

  if (cached && (Date.now() - cached.checkedAt) < HEALTH_TTL_MS) {
    return cached.healthy
  }

  let healthy = false
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 3_000)

    const res = await fetch(`${url}/status`, { signal: controller.signal })
    clearTimeout(timer)
    healthy = res.ok || res.status === 404  // 404 = API up, route not found
  } catch {
    healthy = false
  }

  _healthCache.set(url, { healthy, checkedAt: Date.now() })

  if (!healthy) {
    console.warn('[ai-router] HuggingFace health check failed')
  }

  return healthy
}

// ---------------------------------------------------------------------------
// Dimension validation
// ---------------------------------------------------------------------------

export const DIMENSION_MAP: Record<string, number> = {
  'sentence-transformers/paraphrase-multilingual-mpnet-base-v2': 768,
  'nomic-embed-text':        768,
  'nomic-embed-text:latest': 768,
  // Below models require schema migration before use — listed here as documentation:
  // 'bge-m3':           1024,  // requires vector(1024)
  // 'mxbai-embed-large': 1024, // requires vector(1024)
}

export const EXPECTED_EMBEDDING_DIM = 768

export function validateEmbeddingDimensions(
  embedding: number[],
  model:      string
): void {
  const expected = DIMENSION_MAP[model] ?? EXPECTED_EMBEDDING_DIM
  if (embedding.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch: model "${model}" returned ${embedding.length} dims, expected ${expected}.`
    )
  }
  if (embedding.length !== EXPECTED_EMBEDDING_DIM) {
    throw new Error(
      `Embedding dimension ${embedding.length} is incompatible with schema vector(${EXPECTED_EMBEDDING_DIM}). ` +
      `Cannot write to DB.`
    )
  }
}

/** Alias for validateEmbeddingDimensions — matches the name used in AI-08 task. */
export const validateDimensions = validateEmbeddingDimensions

// ---------------------------------------------------------------------------
// isComplexCriteria — routing hint for future larger-model upgrade
// Currently informational — all scoring uses SCORING_MODEL regardless.
// ---------------------------------------------------------------------------

export function isComplexCriteria(criteria: string): boolean {
  const wordCount       = criteria.trim().split(/\s+/).length
  const hasConditionals = /\b(jeśli|unless|only if|pod warunkiem|chyba że)\b/i.test(criteria)
  const negationCount   = (criteria.match(/\b(nie|bez|no |not |brak)\b/gi) ?? []).length

  return wordCount > 40 || hasConditionals || negationCount >= 3
}

// ---------------------------------------------------------------------------
// resolveModel — synchronous router (HuggingFace is always-up; no health check
// needed before routing, unlike an Ollama VPS that can go offline)
// ---------------------------------------------------------------------------

export interface ResolvedModel {
  groqClient?:      Groq
  hfEmbedUrl?:      string
  hfAuthHeader?:    string
  config:           ModelConfig
  usingFallback:    boolean
}

export function resolveModel(task: AITask): ResolvedModel {
  const config = ROUTING_TABLE[task]

  if (config.provider === 'huggingface') {
    const resolved: ResolvedModel = {
      hfEmbedUrl:    getHuggingFaceEmbedUrl(config.model),
      hfAuthHeader:  getHuggingFaceAuthHeader(),
      config,
      usingFallback: false,
    }
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        event:    'ai_model_resolved',
        task,
        provider: config.provider,
        model:    config.model,
        fallback: false,
        ts:       new Date().toISOString(),
      }))
    }
    return resolved
  }

  if (config.provider === 'groq') {
    const resolved: ResolvedModel = {
      groqClient:    getGroqClient(),
      config,
      usingFallback: false,
    }
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        event:    'ai_model_resolved',
        task,
        provider: config.provider,
        model:    config.model,
        fallback: false,
        ts:       new Date().toISOString(),
      }))
    }
    return resolved
  }

  throw new Error(`[ai-client] Unknown provider: ${config.provider}`)
}
