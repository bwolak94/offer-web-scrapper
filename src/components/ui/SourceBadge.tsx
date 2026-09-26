import { Badge } from '@/components/ui/badge'
import type { Source } from '@/types'

const SOURCE_COLORS: Record<string, string> = {
  otodom:      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  olx:         'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  morizon:     'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  gratka:      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  pracuj:      'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  nofluffjobs: 'bg-sky-100 text-sky-800 dark:bg-sky-900 dark:text-sky-200',
  justjoinit:  'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'olx-praca': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
}

interface SourceBadgeProps {
  source: Source
}

export function SourceBadge({ source }: SourceBadgeProps) {
  const colorClass = SOURCE_COLORS[source] ?? 'bg-gray-100 text-gray-800'
  return (
    <Badge variant="outline" className={`text-xs ${colorClass}`}>
      {source}
    </Badge>
  )
}
