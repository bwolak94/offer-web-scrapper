import { WatchForm } from '@/components/watches/WatchForm'

export default function NewWatchPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Create Watch</h1>
      <WatchForm />
    </div>
  )
}
