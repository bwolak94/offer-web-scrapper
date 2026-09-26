import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

// ── Mock lucide-react icons ───────────────────────────────────────────────────
vi.mock('lucide-react', () => ({
  MoreHorizontal: () => <span data-testid="icon-more" />,
  Pencil:         () => <span data-testid="icon-pencil" />,
  Trash2:         () => <span data-testid="icon-trash" />,
}))

// ── Mock shadcn/ui DropdownMenu ───────────────────────────────────────────────
// Rendered as simple divs/buttons so that jsdom can trigger click handlers.
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-menu">{children}</div>
  ),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="dropdown-trigger">{children}</button>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dropdown-content">{children}</div>
  ),
  DropdownMenuItem: ({
    children,
    onClick,
    variant,
  }: {
    children: React.ReactNode
    onClick?: () => void
    variant?: string
  }) => (
    <button
      data-testid={variant === 'destructive' ? 'dropdown-delete' : 'dropdown-edit'}
      onClick={onClick}
    >
      {children}
    </button>
  ),
}))

// ── Mock shadcn/ui AlertDialog ────────────────────────────────────────────────
// Simulate open/close by rendering children only when open=true.
vi.mock('@/components/ui/alert-dialog', () => ({
  AlertDialog: ({
    children,
    open,
  }: {
    children: React.ReactNode
    open: boolean
    onOpenChange?: (v: boolean) => void
  }) => (open ? <div data-testid="alert-dialog">{children}</div> : null),
  AlertDialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="alert-dialog-content">{children}</div>
  ),
  AlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogTitle: ({ children }: { children: React.ReactNode }) => (
    <h2>{children}</h2>
  ),
  AlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
    <p>{children}</p>
  ),
  AlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  AlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
    <button data-testid="dialog-cancel">{children}</button>
  ),
  AlertDialogAction: ({
    children,
    onClick,
    disabled,
  }: {
    children: React.ReactNode
    onClick?: () => void
    disabled?: boolean
  }) => (
    <button data-testid="dialog-confirm" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}))

// ── Mock shadcn/ui Button ─────────────────────────────────────────────────────
vi.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    disabled,
    type,
    variant,
    size,
    'aria-label': ariaLabel,
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string
    size?: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </button>
  ),
}))

// ── Mock TanStack Query hooks ─────────────────────────────────────────────────
const mockMutate        = vi.fn()
const mockInvalidate    = vi.fn()
const mockRouterPush    = vi.fn()
let   mutationIsPending = false

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ mutationFn, onSuccess }: {
    mutationFn: () => Promise<void>
    onSuccess:  () => void
  }) => ({
    mutate: async () => {
      mockMutate()
      await mutationFn()
      onSuccess()
    },
    isPending: mutationIsPending,
    isError:   false,
  }),
  useQueryClient: () => ({
    invalidateQueries: mockInvalidate,
  }),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
}))

import { WatchActions } from '@/components/watches/WatchActions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function openDeleteDialog() {
  const deleteBtn = screen.getByTestId('dropdown-delete')
  fireEvent.click(deleteBtn)
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WatchActions', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() =>
        Promise.resolve({
          ok:   true,
          json: () => Promise.resolve({}),
        }),
      ),
    )
    mutationIsPending = false
    mockMutate.mockClear()
    mockInvalidate.mockClear()
    mockRouterPush.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  // ── URL construction ────────────────────────────────────────────────────────

  it('calls fetch with DELETE and the exact URL for a normal watchId', async () => {
    render(<WatchActions watchId="watch-abc-123" />)
    openDeleteDialog()
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalled())

    const [url, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/watches/watch-abc-123')
    expect(init.method).toBe('DELETE')
  })

  it('uses the watchId literally — a path-traversal string is not re-interpreted', async () => {
    // Security: confirm that a malicious watchId like "../admin" is passed
    // verbatim to fetch — the server (not the client) is responsible for
    // rejecting it, but we assert the client does not silently alter it.
    render(<WatchActions watchId="../admin" />)
    openDeleteDialog()
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalled())

    const [url] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/api/watches/../admin')
  })

  it('uses a UUID watchId verbatim in the URL', async () => {
    const uuid = '550e8400-e29b-41d4-a716-446655440000'
    render(<WatchActions watchId={uuid} />)
    openDeleteDialog()
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalled())

    const [url] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    expect(url).toBe(`/api/watches/${uuid}`)
  })

  // ── Fetch body: no extra fields ─────────────────────────────────────────────

  it('DELETE request has no body', async () => {
    render(<WatchActions watchId="watch-xyz" />)
    openDeleteDialog()
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    await waitFor(() => expect(vi.mocked(global.fetch)).toHaveBeenCalled())

    const [, init] = vi.mocked(global.fetch).mock.calls[0] as [string, RequestInit]
    // The DELETE mutation sends no body; confirm body is absent or undefined.
    expect(init.body).toBeUndefined()
  })

  // ── Confirmation dialog flow ────────────────────────────────────────────────

  it('does NOT call fetch before the user confirms deletion', () => {
    render(<WatchActions watchId="watch-xyz" />)
    // Dialog not yet opened — fetch must not have been called.
    expect(vi.mocked(global.fetch)).not.toHaveBeenCalled()
  })

  it('opens the confirmation dialog when the delete menu item is clicked', () => {
    render(<WatchActions watchId="watch-xyz" />)
    expect(screen.queryByTestId('alert-dialog')).toBeNull()
    openDeleteDialog()
    expect(screen.getByTestId('alert-dialog')).toBeDefined()
  })

  it('invalidates the watches query after successful deletion', async () => {
    render(<WatchActions watchId="watch-xyz" />)
    openDeleteDialog()
    fireEvent.click(screen.getByTestId('dialog-confirm'))

    await waitFor(() => expect(mockInvalidate).toHaveBeenCalled())
    expect(mockInvalidate).toHaveBeenCalledWith({ queryKey: ['watches'] })
  })

  // ── Edit navigation ─────────────────────────────────────────────────────────

  it('navigates to /watches/{watchId} when Edit is clicked', () => {
    render(<WatchActions watchId="watch-edit-99" />)
    fireEvent.click(screen.getByTestId('dropdown-edit'))
    expect(mockRouterPush).toHaveBeenCalledWith('/watches/watch-edit-99')
  })
})
