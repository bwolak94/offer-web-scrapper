import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { WatchRow } from './WatchRow'
import type { Watch } from '@/types'

interface WatchListProps {
  watches: Watch[]
}

export function WatchList({ watches }: WatchListProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Type</TableHead>
          <TableHead>Criteria</TableHead>
          <TableHead>Min Score</TableHead>
          <TableHead>Notify</TableHead>
          <TableHead>Created</TableHead>
          <TableHead className="w-[80px]">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {watches.map((watch) => (
          <WatchRow key={watch.id} watch={watch} />
        ))}
      </TableBody>
    </Table>
  )
}
