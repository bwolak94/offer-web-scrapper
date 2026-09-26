'use client'
import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface PriceRangeSliderProps {
  min?: number
  max?: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  currency?: string
  step?: number
}

export function PriceRangeSlider({
  min = 0,
  max = 5_000_000,
  value,
  onChange,
  currency = 'PLN',
  step = 10_000,
}: PriceRangeSliderProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[160px]">
      <Label className="text-xs">
        Price: {value[0].toLocaleString('pl-PL')} – {value[1].toLocaleString('pl-PL')} {currency}
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
