import { notFound } from 'next/navigation'
import { WatchForm } from '@/components/watches/WatchForm'
import type { Watch } from '@/types'

interface PageProps {
  params: Promise<{ id: string }>
}

type RawWatch = Omit<Watch, 'createdAt' | 'updatedAt'> & {
  createdAt: string
  updatedAt: string
}

async function getWatch(id: string): Promise<Watch | null> {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL}/api/watches/${encodeURIComponent(id)}`,
    { cache: 'no-store' },
  )
  if (res.status === 404) return null
  if (!res.ok) throw new Error('Failed to fetch watch')
  const { data: raw }: { data: RawWatch } = await res.json()
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
  }
}

export default async function EditWatchPage({ params }: PageProps) {
  const { id } = await params
  const watch  = await getWatch(id)
  if (!watch) notFound()

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Edit Watch</h1>
      <WatchForm
        watchId={watch.id}
        initialValues={{
          type:          watch.type,
          criteria:      watch.criteria ?? undefined,
          minScore:      watch.minScore,
          notifyEmail:   watch.notifyEmail ?? undefined,
          notifyWebhook: watch.notifyWebhook ?? undefined,
          filters:       watch.filters as Record<string, unknown>,
        }}
      />
    </div>
  )
}
