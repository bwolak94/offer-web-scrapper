'use client'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Label } from '@/components/ui/label'

interface RoomsSelectProps {
  value: number[]
  onChange: (rooms: number[]) => void
}

const ROOM_OPTIONS = [1, 2, 3, 4, 5]

export function RoomsSelect({ value, onChange }: RoomsSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">Rooms</Label>
      <ToggleGroup
        multiple
        value={value.map(String)}
        onValueChange={(vals) => onChange(vals.map(Number))}
      >
        {ROOM_OPTIONS.map((n) => (
          <ToggleGroupItem
            key={n}
            value={String(n)}
            aria-label={`${n} rooms`}
            className="h-8 w-8 text-xs"
          >
            {n === 5 ? '5+' : n}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
