'use client'

import { Slider } from '@/components/ui/slider'
import { Label } from '@/components/ui/label'

interface SalaryRangeSliderProps {
  value:     [number, number]
  onChange:  (value: [number, number]) => void
  min?:      number
  max?:      number
  step?:     number
  currency?: string
}

export function SalaryRangeSlider({
  value,
  onChange,
  min = 0,
  max = 50_000,
  step = 500,
  currency = 'PLN',
}: SalaryRangeSliderProps) {
  return (
    <div className="flex flex-col gap-1.5 min-w-[180px]">
      <Label className="text-xs">
        Salary:{' '}
        {value[0].toLocaleString('pl-PL')}
        {' – '}
        {value[1].toLocaleString('pl-PL')} {currency}/mo
      </Label>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        onValueChange={(v) => onChange(v as [number, number])}
        className="w-full"
      />
    </div>
  )
}
