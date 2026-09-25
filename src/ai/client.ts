import Groq from 'groq-sdk'

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
  provider:        'groq' | 'huggingface'
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
    model:          process.env.SCORING_MODEL ?? 'llama-3.1-8b-instant',
    maxTokens:      120,
    temperature:    0.0,
    responseFormat: { type: 'json_object' },
    seed:           42,
  },
  [AITask.SCORE_JOB]: {
    provider:       'groq',
    model:          process.env.SCORING_MODEL ?? 'llama-3.1-8b-instant',
    maxTokens:      120,
    temperature:    0.0,
    responseFormat: { type: 'json_object' },
    seed:           42,
  },
}

// ---------------------------------------------------------------------------
// Groq client (singleton)
// ---------------------------------------------------------------------------

const groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })

export function getGroqClient(): Groq {
  return groqClient
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
// Dimension validation
// ---------------------------------------------------------------------------

export const DIMENSION_MAP: Record<string, number> = {
  'sentence-transformers/paraphrase-multilingual-mpnet-base-v2': 768,
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

// ---------------------------------------------------------------------------
// resolveModel — synchronous router (no async health check needed)
// ---------------------------------------------------------------------------

export interface ResolvedModel {
  groqClient?:  Groq
  hfEmbedUrl?:  string
  hfAuthHeader?: string
  config:        ModelConfig
}

export function resolveModel(task: AITask): ResolvedModel {
  const config = ROUTING_TABLE[task]

  if (config.provider === 'huggingface') {
    return {
      hfEmbedUrl:   getHuggingFaceEmbedUrl(config.model),
      hfAuthHeader: getHuggingFaceAuthHeader(),
      config,
    }
  }

  if (config.provider === 'groq') {
    return { groqClient: getGroqClient(), config }
  }

  throw new Error(`[ai-client] Unknown provider: ${config.provider}`)
}
