import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import type { ListingSummary } from '@/types'

vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [key: string]: unknown }) =>
    <a href={href} {...props}>{children}</a>,
}))

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) =>
    <img src={src} alt={alt} />,
}))

// Mock sub-components to isolate ListingCard
vi.mock('@/components/listings/ListingCardImage', () => ({
  ListingCardImage: ({ alt }: { src: string | null; alt: string; priority?: boolean }) =>
    <div data-testid="listing-card-image" data-alt={alt} />,
}))

vi.mock('@/components/listings/ListingCardBody', () => ({
  ListingCardBody: ({ listing }: { listing: ListingSummary }) =>
    <div data-testid="listing-card-body">{listing.title}</div>,
}))

import { ListingCard } from '@/components/listings/ListingCard'

const mockListing: ListingSummary = {
  id: 'abc123',
  category: 'sale',
  source: 'otodom',
  url: 'https://example.com/listing/abc123',
  title: 'Mieszkanie Warszawa Mokotów',
  price: 750000,
  currency: 'PLN',
  areaM2: 65,
  rooms: 3,
  location: 'Warszawa',
  lat: null,
  lng: null,
  images: [],
  aiScore: null,
  scoreStatus: 'pending',
  scrapedAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
}

describe('ListingCard', () => {
  it('renders a link pointing to /listing/{id}', () => {
    render(<ListingCard listing={mockListing} />)
    const link = screen.getByRole('link')
    expect(link.getAttribute('href')).toBe('/listing/abc123')
  })

  it('renders the listing title via ListingCardBody', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByText('Mieszkanie Warszawa Mokotów')).toBeDefined()
  })

  it('renders without crashing when images array is empty', () => {
    const listingNoImages = { ...mockListing, images: [] }
    const { container } = render(<ListingCard listing={listingNoImages} />)
    expect(container.firstChild).toBeDefined()
  })

  it('renders without crashing when images array has entries', () => {
    const listingWithImages = { ...mockListing, images: ['https://example.com/img.jpg'] }
    const { container } = render(<ListingCard listing={listingWithImages} />)
    expect(container.firstChild).toBeDefined()
  })

  it('renders ListingCardImage and ListingCardBody sub-components', () => {
    render(<ListingCard listing={mockListing} />)
    expect(screen.getByTestId('listing-card-image')).toBeDefined()
    expect(screen.getByTestId('listing-card-body')).toBeDefined()
  })
})
