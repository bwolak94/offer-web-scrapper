'use client'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface ScoreMinSliderProps {
  value: number
  onChange: (value: number) => void
}

export function ScoreMinSlider({ value, onChange }: ScoreMinSliderProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[120px]">
      <Label className="text-xs">Min score: {value}</Label>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        onValueChange={(v) => {
          const first = (v as number[])[0]
          if (first !== undefined) onChange(first)
        }}
      />
    </div>
  )
}
