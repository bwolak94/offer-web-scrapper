import { TableRow, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { WatchActions } from './WatchActions'
import type { Watch } from '@/types'

interface WatchRowProps {
  watch: Watch
}

export function WatchRow({ watch }: WatchRowProps) {
  const notifyTargets = [
    watch.notifyEmail ? 'Email' : null,
    watch.notifyWebhook ? 'Webhook' : null,
  ].filter(Boolean) as string[]

  return (
    <TableRow>
      <TableCell>
        <Badge variant={watch.type === 'listing' ? 'default' : 'secondary'}>
          {watch.type === 'listing' ? 'Real Estate' : 'Jobs'}
        </Badge>
      </TableCell>
      <TableCell className="max-w-[200px] truncate text-sm">
        {watch.criteria ?? (
          <span className="italic text-muted-foreground">No criteria</span>
        )}
      </TableCell>
      <TableCell className="text-sm">{watch.minScore}</TableCell>
      <TableCell>
        {notifyTargets.length > 0 ? (
          notifyTargets.map((t) => (
            <Badge key={t} variant="outline" className="mr-1 text-xs">
              {t}
            </Badge>
          ))
        ) : (
          <span className="text-xs text-muted-foreground">None</span>
        )}
      </TableCell>
      <TableCell className="text-sm text-muted-foreground">
        {watch.createdAt.toLocaleDateString('pl-PL')}
      </TableCell>
      <TableCell>
        <WatchActions watchId={watch.id} />
      </TableCell>
    </TableRow>
  )
}
