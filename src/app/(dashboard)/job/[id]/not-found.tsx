import Link from 'next/link'

export default function JobNotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16">
      <h2 className="text-xl font-semibold">Job offer not found</h2>
      <p className="text-sm text-muted-foreground">
        This job offer may have been removed or the URL is incorrect.
      </p>
      <Link
        href="/jobs"
        className="text-sm underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Browse job offers
      </Link>
    </div>
  )
}
