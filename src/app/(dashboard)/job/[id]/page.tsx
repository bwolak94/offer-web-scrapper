import { notFound } from 'next/navigation'
import { JobDetailHeader } from '@/components/jobs/JobDetailHeader'
import { JobMetaGrid } from '@/components/jobs/JobMetaGrid'
import { SnapshotTimeline } from '@/components/listings/SnapshotTimeline'
import { DescriptionBlock } from '@/components/ui/DescriptionBlock'
import type { JobPublic, Snapshot } from '@/types'
import { env } from '@/lib/env'

interface PageProps {
  params: Promise<{ id: string }>
}

type RawJobPublic = Omit<JobPublic, 'scrapedAt' | 'updatedAt' | 'scoredAt'> & {
  scrapedAt: string
  updatedAt: string
  scoredAt:  string | null
}

type RawSnapshot = Omit<Snapshot, 'snappedAt'> & { snappedAt: string }

async function getJob(id: string): Promise<JobPublic | null> {
  const res = await fetch(`${env.NEXT_PUBLIC_APP_URL}/api/jobs/${id}`, {
    next: { revalidate: 60 },
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch job')
  // API returns { data: job } envelope
  const { data: raw }: { data: RawJobPublic } = await res.json()
  return {
    ...raw,
    scrapedAt: new Date(raw.scrapedAt),
    updatedAt: new Date(raw.updatedAt),
    scoredAt:  raw.scoredAt ? new Date(raw.scoredAt) : null,
  }
}

async function getSnapshots(refId: string): Promise<Snapshot[]> {
  const res = await fetch(
    `${env.NEXT_PUBLIC_APP_URL}/api/snapshots?refId=${encodeURIComponent(refId)}&refType=job`,
    { next: { revalidate: 60 } }
  )
  if (!res.ok) return []
  // API returns { data: snapshots[] } envelope
  const { data: raws }: { data: RawSnapshot[] } = await res.json()
  return raws.map((r) => ({ ...r, snappedAt: new Date(r.snappedAt) }))
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params

  const [job, snapshots] = await Promise.all([
    getJob(id),
    getSnapshots(id),
  ])

  if (!job) notFound()

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <JobDetailHeader job={job} />

      <JobMetaGrid job={job} />

      {job.description && (
        <DescriptionBlock text={job.description} maxLines={8} />
      )}

      {snapshots.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Change History
          </h2>
          <SnapshotTimeline snapshots={snapshots} />
        </section>
      )}
    </div>
  )
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params
  const job = await getJob(id)
  if (!job) return {}
  return {
    title:       `${job.title}${job.company ? ` at ${job.company}` : ''} — Offer Scrapper`,
    description: job.description?.slice(0, 160),
  }
}
