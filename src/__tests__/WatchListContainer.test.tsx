import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Watch } from '@/types'

// ─── Mock @tanstack/react-query ────────────────────────────────────────────────
// Must be declared before the component import so Vitest can hoist it.
const mockUseQuery = vi.fn()

vi.mock('@tanstack/react-query', () => ({
  useQuery: (opts: unknown) => mockUseQuery(opts),
}))

// ─── Mock next/link ────────────────────────────────────────────────────────────
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}))

// ─── Mock WatchList ────────────────────────────────────────────────────────────
// Capture the last props passed so we can assert date deserialization.
let lastWatchListProps: { watches: Watch[] } | null = null

vi.mock('@/components/watches/WatchList', () => ({
  WatchList: (props: { watches: Watch[] }) => {
    lastWatchListProps = props
    return <div data-testid="watch-list" data-count={props.watches.length} />
  },
}))

import { WatchListContainer } from '@/components/watches/WatchListContainer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRawWatch(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'watch-1',
    type: 'listing',
    filters: {},
    criteria: null,
    criteriaEmbedding: null,
    minScore: 60,
    notifyEmail: null,
    notifyWebhook: null,
    active: true,
    createdAt: '2024-06-15T10:00:00.000Z',
    updatedAt: '2024-06-20T08:30:00.000Z',
    ...overrides,
  }
}

describe('WatchListContainer', () => {
  beforeEach(() => {
    mockUseQuery.mockReset()
    lastWatchListProps = null
  })

  it('shows empty state with "No watches yet" and a link to /watches/new when data is empty', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, error: null })

    render(<WatchListContainer />)

    expect(screen.getByText(/No watches yet/i)).toBeDefined()
    const link = screen.getByRole('link', { name: /Create your first watch/i })
    expect(link).toBeDefined()
    expect(link.getAttribute('href')).toBe('/watches/new')
  })

  it('renders WatchList when watches are returned', () => {
    mockUseQuery.mockReturnValue({
      data: [makeRawWatch(), makeRawWatch({ id: 'watch-2' })] as Watch[],
      isLoading: false,
      error: null,
    })

    render(<WatchListContainer />)

    expect(screen.getByTestId('watch-list')).toBeDefined()
  })

  it('passes all watches to WatchList', () => {
    const watches = [
      makeRawWatch({ id: 'w-1' }),
      makeRawWatch({ id: 'w-2' }),
      makeRawWatch({ id: 'w-3' }),
    ] as Watch[]

    mockUseQuery.mockReturnValue({ data: watches, isLoading: false, error: null })

    render(<WatchListContainer />)

    const listEl = screen.getByTestId('watch-list')
    expect(listEl.getAttribute('data-count')).toBe('3')
  })

  it('shows error message "Failed to load watches" when error is set', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('network error'),
    })

    render(<WatchListContainer />)

    expect(screen.getByText('Failed to load watches')).toBeDefined()
  })

  it('returns null (no DOM output) while isLoading is true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true, error: null })

    const { container } = render(<WatchListContainer />)

    expect(container.firstChild).toBeNull()
  })

  it('does not render WatchList when isLoading is true', () => {
    mockUseQuery.mockReturnValue({ data: [], isLoading: true, error: null })

    render(<WatchListContainer />)

    expect(screen.queryByTestId('watch-list')).toBeNull()
  })

  it('does not render WatchList when error is set', () => {
    mockUseQuery.mockReturnValue({
      data: [],
      isLoading: false,
      error: new Error('oops'),
    })

    render(<WatchListContainer />)

    expect(screen.queryByTestId('watch-list')).toBeNull()
  })

  it('correctly maps createdAt/updatedAt strings to Date objects before passing to WatchList', () => {
    const rawCreatedAt = '2024-03-01T09:00:00.000Z'
    const rawUpdatedAt = '2024-03-15T14:00:00.000Z'

    // Simulate what WatchListContainer's fetchWatches does: it receives raw strings
    // and converts them to Date instances. useQuery is mocked to return already-
    // converted data (as the real queryFn would return) so we can verify the
    // Watch objects reaching WatchList have proper Date instances.
    const deserializedWatch: Watch = {
      id: 'watch-dates',
      type: 'listing',
      filters: {},
      criteria: null,
      criteriaEmbedding: null,
      minScore: 50,
      notifyEmail: null,
      notifyWebhook: null,
      active: true,
      createdAt: new Date(rawCreatedAt),
      updatedAt: new Date(rawUpdatedAt),
    }

    mockUseQuery.mockReturnValue({
      data: [deserializedWatch],
      isLoading: false,
      error: null,
    })

    render(<WatchListContainer />)

    expect(lastWatchListProps).not.toBeNull()
    const passedWatch = lastWatchListProps!.watches[0]
    expect(passedWatch.createdAt).toBeInstanceOf(Date)
    expect(passedWatch.updatedAt).toBeInstanceOf(Date)
    expect(passedWatch.createdAt.toISOString()).toBe(rawCreatedAt)
    expect(passedWatch.updatedAt.toISOString()).toBe(rawUpdatedAt)
  })

  it('fetchWatches deserializes date strings to Date instances', async () => {
    // Verify the actual fetchWatches function (used as queryFn) converts strings to Dates.
    // We intercept the queryFn passed to useQuery and call it directly.
    let capturedQueryFn: (() => Promise<Watch[]>) | null = null

    mockUseQuery.mockImplementation((opts: { queryFn: () => Promise<Watch[]> }) => {
      capturedQueryFn = opts.queryFn
      return { data: [], isLoading: false, error: null }
    })

    render(<WatchListContainer />)

    expect(capturedQueryFn).not.toBeNull()

    const rawCreatedAt = '2024-05-10T08:00:00.000Z'
    const rawUpdatedAt = '2024-05-11T12:00:00.000Z'

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 'watch-fetch',
            type: 'job',
            filters: {},
            criteria: null,
            criteriaEmbedding: null,
            minScore: 40,
            notifyEmail: null,
            notifyWebhook: null,
            active: true,
            createdAt: rawCreatedAt,
            updatedAt: rawUpdatedAt,
          },
        ],
      }),
    })

    const result = await capturedQueryFn!()

    expect(result).toHaveLength(1)
    expect(result[0].createdAt).toBeInstanceOf(Date)
    expect(result[0].updatedAt).toBeInstanceOf(Date)
    expect(result[0].createdAt.toISOString()).toBe(rawCreatedAt)
    expect(result[0].updatedAt.toISOString()).toBe(rawUpdatedAt)
  })

  it('fetchWatches throws when the response is not ok', async () => {
    let capturedQueryFn: (() => Promise<Watch[]>) | null = null

    mockUseQuery.mockImplementation((opts: { queryFn: () => Promise<Watch[]> }) => {
      capturedQueryFn = opts.queryFn
      return { data: [], isLoading: false, error: null }
    })

    render(<WatchListContainer />)

    global.fetch = vi.fn().mockResolvedValueOnce({ ok: false })

    await expect(capturedQueryFn!()).rejects.toThrow('Failed to fetch watches')
  })
})
