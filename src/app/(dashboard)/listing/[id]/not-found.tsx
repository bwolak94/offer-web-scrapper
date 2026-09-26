import Link from 'next/link'

export default function ListingNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Listing not found</h2>
      <p className="text-sm text-muted-foreground">
        This listing may have been removed or the URL is incorrect.
      </p>
      <Link
        href="/real-estate/sale"
        className="text-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse listings
      </Link>
    </div>
  )
}
