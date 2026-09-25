'use client'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface AreaRangeSliderProps {
  min?: number
  max?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  step?: number
}

export function AreaRangeSlider({
  min = 0,
  max = 300,
  value,
  onChange,
  step = 5,
}: AreaRangeSliderProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[140px]">
      <Label className="text-xs">
        Area: {value[0]} – {value[1]} m²
      </Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
      />
    </div>
  )
}
