import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SourceBadge } from '@/components/ui/SourceBadge'
import type { Source } from '@/types'

describe('SourceBadge', () => {
  it('renders the source name as text', () => {
    render(<SourceBadge source={'otodom' as Source} />)
    expect(screen.getByText('otodom')).toBeDefined()
  })

  it('applies orange color classes for "otodom"', () => {
    const { container } = render(<SourceBadge source={'otodom' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-orange-100')
    expect(badge.className).toContain('text-orange-800')
  })

  it('applies pink color classes for "justjoinit"', () => {
    const { container } = render(<SourceBadge source={'justjoinit' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-pink-100')
    expect(badge.className).toContain('text-pink-800')
  })

  it('applies fallback gray classes for unknown source', () => {
    const { container } = render(<SourceBadge source={'unknown-source' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-gray-100')
    expect(badge.className).toContain('text-gray-800')
  })

  it('renders correct text for "olx"', () => {
    render(<SourceBadge source={'olx' as Source} />)
    expect(screen.getByText('olx')).toBeDefined()
  })

  it('applies green color classes for "olx"', () => {
    const { container } = render(<SourceBadge source={'olx' as Source} />)
    const badge = container.querySelector('span')!
    expect(badge.className).toContain('bg-green-100')
    expect(badge.className).toContain('text-green-800')
  })
})
