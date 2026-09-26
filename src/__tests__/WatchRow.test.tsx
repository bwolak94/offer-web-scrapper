import { render, screen } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('@/components/ui/table', () => ({
  TableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
  TableCell: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <td className={className}>{children}</td>
  ),
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({
    children,
    variant,
    className,
  }: {
    children: React.ReactNode
    variant?: string
    className?: string
  }) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}))

vi.mock('@/components/watches/WatchActions', () => ({
  WatchActions: ({ watchId }: { watchId: string }) => (
    <button data-testid="watch-actions" data-watch-id={watchId} />
  ),
}))

import { WatchRow } from '@/components/watches/WatchRow'
import type { Watch } from '@/types'

const BASE_DATE = new Date('2024-06-15T10:00:00.000Z')

function makeWatch(overrides: Partial<Watch> = {}): Watch {
  return {
    id: 'watch-1',
    type: 'listing',
    filters: {},
    criteria: 'Apartment in Mokotów',
    criteriaEmbedding: null,
    minScore: 70,
    notifyEmail: null,
    notifyWebhook: null,
    active: true,
    createdAt: BASE_DATE,
    updatedAt: BASE_DATE,
    ...overrides,
  }
}

describe('WatchRow', () => {
  it('renders "Real Estate" badge for type: listing', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ type: 'listing' })} />
        </tbody>
      </table>,
    )
    const badges = screen.getAllByTestId('badge')
    const typeBadge = badges.find((b) => b.textContent === 'Real Estate')
    expect(typeBadge).toBeDefined()
  })

  it('renders "Jobs" badge for type: job', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ type: 'job' })} />
        </tbody>
      </table>,
    )
    const badges = screen.getAllByTestId('badge')
    const typeBadge = badges.find((b) => b.textContent === 'Jobs')
    expect(typeBadge).toBeDefined()
  })

  it('shows criteria text when present', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ criteria: 'Quiet street near metro' })} />
        </tbody>
      </table>,
    )
    expect(screen.getByText('Quiet street near metro')).toBeDefined()
  })

  it('shows "No criteria" italic span when criteria is null', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ criteria: null })} />
        </tbody>
      </table>,
    )
    const span = screen.getByText('No criteria')
    expect(span).toBeDefined()
    expect(span.tagName.toLowerCase()).toBe('span')
    expect(span.className).toContain('italic')
  })

  it('shows "Email" badge when notifyEmail is set', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ notifyEmail: 'user@example.com' })} />
        </tbody>
      </table>,
    )
    const badges = screen.getAllByTestId('badge')
    const emailBadge = badges.find((b) => b.textContent === 'Email')
    expect(emailBadge).toBeDefined()
  })

  it('shows "Webhook" badge when notifyWebhook is set', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ notifyWebhook: 'https://hooks.example.com/notify' })} />
        </tbody>
      </table>,
    )
    const badges = screen.getAllByTestId('badge')
    const webhookBadge = badges.find((b) => b.textContent === 'Webhook')
    expect(webhookBadge).toBeDefined()
  })

  it('shows both "Email" and "Webhook" badges when both are set', () => {
    render(
      <table>
        <tbody>
          <WatchRow
            watch={makeWatch({
              notifyEmail: 'user@example.com',
              notifyWebhook: 'https://hooks.example.com/notify',
            })}
          />
        </tbody>
      </table>,
    )
    const badges = screen.getAllByTestId('badge')
    expect(badges.find((b) => b.textContent === 'Email')).toBeDefined()
    expect(badges.find((b) => b.textContent === 'Webhook')).toBeDefined()
  })

  it('shows "None" span when both notifyEmail and notifyWebhook are null', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ notifyEmail: null, notifyWebhook: null })} />
        </tbody>
      </table>,
    )
    expect(screen.getByText('None')).toBeDefined()
  })

  it('shows minScore value', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ minScore: 55 })} />
        </tbody>
      </table>,
    )
    expect(screen.getByText('55')).toBeDefined()
  })

  it('shows formatted date via toLocaleDateString("pl-PL")', () => {
    // Pin a specific date and verify the pl-PL locale formatting is rendered
    const fixedDate = new Date('2024-03-07T12:00:00.000Z')
    const expectedFormatted = fixedDate.toLocaleDateString('pl-PL')

    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ createdAt: fixedDate })} />
        </tbody>
      </table>,
    )

    expect(screen.getByText(expectedFormatted)).toBeDefined()
  })

  it('does not show "Email" badge when notifyEmail is null', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ notifyEmail: null })} />
        </tbody>
      </table>,
    )
    const badges = screen.queryAllByTestId('badge')
    expect(badges.every((b) => b.textContent !== 'Email')).toBe(true)
  })

  it('does not show "Webhook" badge when notifyWebhook is null', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ notifyWebhook: null })} />
        </tbody>
      </table>,
    )
    const badges = screen.queryAllByTestId('badge')
    expect(badges.every((b) => b.textContent !== 'Webhook')).toBe(true)
  })

  it('renders WatchActions with the correct watchId', () => {
    render(
      <table>
        <tbody>
          <WatchRow watch={makeWatch({ id: 'watch-abc-123' })} />
        </tbody>
      </table>,
    )
    const actions = screen.getByTestId('watch-actions')
    expect(actions.getAttribute('data-watch-id')).toBe('watch-abc-123')
  })
})
