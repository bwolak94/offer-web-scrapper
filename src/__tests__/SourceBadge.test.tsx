import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SourceBadge } from '@/components/ui/SourceBadge'
import type { Source } from '@/types'

describe('SourceBadge', () => {
  it('renders the human-readable label for "otodom"', () => {
    render(<SourceBadge source={'otodom' as Source} />)
    expect(screen.getByText('Otodom')).toBeDefined()
  })

  it('applies amber color classes for "otodom"', () => {
    const { container } = render(<SourceBadge source={'otodom' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-amber-50')
    expect(badge.className).toContain('text-amber-700')
  })

  it('applies fuchsia color classes for "justjoinit"', () => {
    const { container } = render(<SourceBadge source={'justjoinit' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-fuchsia-50')
    expect(badge.className).toContain('text-fuchsia-700')
  })

  it('applies fallback muted classes for unknown source', () => {
    const { container } = render(<SourceBadge source={'unknown-source' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-muted')
    expect(badge.className).toContain('text-muted-foreground')
  })

  it('renders "OLX" label for "olx"', () => {
    render(<SourceBadge source={'olx' as Source} />)
    expect(screen.getByText('OLX')).toBeDefined()
  })

  it('applies emerald color classes for "olx"', () => {
    const { container } = render(<SourceBadge source={'olx' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-emerald-50')
    expect(badge.className).toContain('text-emerald-700')
  })

  it('renders a dot indicator for every known source', () => {
    const { container } = render(<SourceBadge source={'pracuj' as Source} />)
    const dot = container.querySelector('span[aria-hidden="true"]')!
    expect(dot).toBeDefined()
    expect(dot.className).toContain('rounded-full')
  })
})
