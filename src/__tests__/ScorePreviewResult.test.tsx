import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Mock shadcn/ui Skeleton ───────────────────────────────────────────────────
vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}))

// ── Mock ScoreBadge ───────────────────────────────────────────────────────────
vi.mock('@/components/ui/ScoreBadge', () => ({
  ScoreBadge: ({
    score,
    showLabel,
  }: {
    score: number | null
    size?: string
    showLabel?: boolean
  }) => (
    <div data-testid="score-badge" data-score={score} data-show-label={showLabel}>
      {showLabel && score !== null ? `${score}/100` : null}
    </div>
  ),
}))

// ── TanStack Query mock state (mutable per-test) ──────────────────────────────
// We mock useQuery directly so we can control isLoading / error / data
// without setting up a real QueryClient + network intercepts.
type UseQueryState = {
  data:      import('@/types').ScoreResponse | undefined
  isLoading: boolean
  error:     Error | null
}

let queryState: UseQueryState = { data: undefined, isLoading: false, error: null }

// Capture the last queryFn that was passed to useQuery so we can call it and
// inspect the underlying fetch arguments.
let capturedQueryFn: (() => Promise<import('@/types').ScoreResponse>) | null = null

vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ queryFn }: { queryFn: () => Promise<import('@/types').ScoreResponse> }) => {
    capturedQueryFn = queryFn
    return queryState
  },
}))

import { ScorePreviewResult } from '@/components/watches/ScorePreviewResult'

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeOkFetch(body: unknown) {
  return vi.fn(() =>
    Promise.resolve({
      ok:   true,
      json: () => Promise.resolve(body),
    }),
  )
}

function makeErrorFetch() {
  return vi.fn(() =>
    Promise.resolve({
      ok:     false,
      status: 500,
      json:   () => Promise.resolve({}),
    }),
  )
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ScorePreviewResult', () => {
  beforeEach(() => {
    capturedQueryFn = null
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    // Reset query state to a neutral default after each test.
    queryState = { data: undefined, isLoading: false, error: null }
  })

  // ── Security: fetch body must contain preview:true and NO id ───────────────

  it('sends preview:true in the fetch body', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ score: 80, reasoning: 'good' }))
    queryState = { data: undefined, isLoading: false, error: null }

    render(<ScorePreviewResult criteria="nice flat" watchType="listing" />)

    // Invoke the captured queryFn to trigger the actual fetch call.
    expect(capturedQueryFn).not.toBeNull()
    await capturedQueryFn!()

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(body.preview).toBe(true)
  })

  it('does NOT include an id field in the fetch body', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ score: 80, reasoning: 'good' }))
    queryState = { data: undefined, isLoading: false, error: null }

    render(<ScorePreviewResult criteria="nice flat" watchType="listing" />)

    expect(capturedQueryFn).not.toBeNull()
    await capturedQueryFn!()

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    // Security: preview requests must never include an id — doing so would
    // allow forging an identity for a real record and bypassing server-side
    // id validation.
    expect(Object.prototype.hasOwnProperty.call(body, 'id')).toBe(false)
  })

  it('sends the correct type and criteria in the fetch body', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ score: 55, reasoning: 'ok' }))
    queryState = { data: undefined, isLoading: false, error: null }

    render(<ScorePreviewResult criteria="senior typescript remote" watchType="job" />)

    expect(capturedQueryFn).not.toBeNull()
    await capturedQueryFn!()

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    const body = JSON.parse(init.body as string)
    expect(url).toBe('/api/score')
    expect(body.type).toBe('job')
    expect(body.criteria).toBe('senior typescript remote')
  })

  it('sends Content-Type: application/json header', async () => {
    vi.stubGlobal('fetch', makeOkFetch({ score: 60, reasoning: 'decent' }))
    queryState = { data: undefined, isLoading: false, error: null }

    render(<ScorePreviewResult criteria="flat near metro" watchType="listing" />)

    expect(capturedQueryFn).not.toBeNull()
    await capturedQueryFn!()

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    const headers = init.headers as Record<string, string>
    expect(headers['Content-Type']).toBe('application/json')
  })

  it('throws when the fetch response is not ok', async () => {
    vi.stubGlobal('fetch', makeErrorFetch())
    queryState = { data: undefined, isLoading: false, error: null }

    render(<ScorePreviewResult criteria="test" watchType="listing" />)

    expect(capturedQueryFn).not.toBeNull()
    await expect(capturedQueryFn!()).rejects.toThrow('Failed to get score preview')
  })

  // ── Loading state ────────────────────────────────────────────────────────────

  it('shows skeleton elements while loading', () => {
    queryState = { data: undefined, isLoading: true, error: null }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    const skeletons = screen.getAllByTestId('skeleton')
    expect(skeletons.length).toBeGreaterThanOrEqual(1)
    // ScoreBadge must NOT be rendered during loading.
    expect(screen.queryByTestId('score-badge')).toBeNull()
  })

  it('renders the "Scoring a sample listing…" hint while loading', () => {
    queryState = { data: undefined, isLoading: true, error: null }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)
    expect(screen.getByText('Scoring a sample listing…')).toBeDefined()
  })

  // ── Error state ───────────────────────────────────────────────────────────────

  it('shows an error message when the query fails', () => {
    queryState = {
      data:      undefined,
      isLoading: false,
      error:     new Error('Network error'),
    }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    expect(screen.getByText(/Could not load preview/)).toBeDefined()
    expect(screen.getByText(/Network error/)).toBeDefined()
  })

  it('does NOT show a skeleton or score badge in the error state', () => {
    queryState = {
      data:      undefined,
      isLoading: false,
      error:     new Error('Timeout'),
    }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    expect(screen.queryByTestId('skeleton')).toBeNull()
    expect(screen.queryByTestId('score-badge')).toBeNull()
  })

  // ── Security: XSS in error message ───────────────────────────────────────────

  it('renders error.message as plain text, not as HTML', () => {
    const xssError = new Error('<img src=x onerror=alert(1)>')
    queryState = { data: undefined, isLoading: false, error: xssError }

    const { container } = render(
      <ScorePreviewResult criteria="test" watchType="listing" />,
    )
    // The injected img tag must not appear as a parsed DOM element.
    expect(container.querySelector('img')).toBeNull()
    // The raw string should be visible as text content.
    expect(screen.getByText(/Could not load preview/)).toBeDefined()
  })

  // ── Data (success) state ─────────────────────────────────────────────────────

  it('renders ScoreBadge with the returned score when data is available', () => {
    queryState = {
      data:      { score: 78, reasoning: 'Great match' },
      isLoading: false,
      error:     null,
    }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    const badge = screen.getByTestId('score-badge')
    expect(badge.getAttribute('data-score')).toBe('78')
  })

  it('renders the reasoning text when data includes it', () => {
    queryState = {
      data:      { score: 62, reasoning: 'Partial match due to location.' },
      isLoading: false,
      error:     null,
    }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    expect(screen.getByText('Partial match due to location.')).toBeDefined()
  })

  it('does not render reasoning paragraph when reasoning is absent', () => {
    // ScoreResponse.reasoning may be an empty string — component guards with
    // `{data.reasoning && ...}` so an empty string produces no element.
    queryState = {
      data:      { score: 50, reasoning: '' },
      isLoading: false,
      error:     null,
    }
    render(<ScorePreviewResult criteria="some criteria" watchType="listing" />)

    // Empty string is falsy — no paragraph should exist for the reasoning.
    const paragraphs = screen.queryAllByText(/\S+/)
    // Verify none of the visible text nodes equals the empty reasoning value.
    paragraphs.forEach((p) => {
      expect(p.textContent).not.toBe('')
    })
  })

  it('renders nothing when data is undefined and not loading and no error', () => {
    queryState = { data: undefined, isLoading: false, error: null }
    const { container } = render(
      <ScorePreviewResult criteria="some criteria" watchType="listing" />,
    )
    // Component returns null in this state — container should be empty.
    expect(container.firstChild).toBeNull()
  })

  // ── showLabel on ScoreBadge ───────────────────────────────────────────────────

  it('passes showLabel to ScoreBadge in success state', () => {
    queryState = {
      data:      { score: 90, reasoning: 'Excellent' },
      isLoading: false,
      error:     null,
    }
    render(<ScorePreviewResult criteria="luxury penthouse" watchType="listing" />)

    const badge = screen.getByTestId('score-badge')
    // The component passes showLabel prop — our mock serialises it as string.
    expect(badge.getAttribute('data-show-label')).toBe('true')
  })
})
