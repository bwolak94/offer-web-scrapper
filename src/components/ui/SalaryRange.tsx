interface SalaryRangeProps {
  min:      number | null
  max:      number | null
  currency: string
}

export function SalaryRange({ min, max, currency }: SalaryRangeProps) {
  if (min == null && max == null) {
    return <span className="text-xs text-muted-foreground">Undisclosed</span>
  }
  const fmt = (n: number) => n.toLocaleString('pl-PL', { maximumFractionDigits: 0 })
  const range = min != null && max != null
    ? `${fmt(min)} – ${fmt(max)}`
    : min != null
    ? `from ${fmt(min)}`
    : `up to ${fmt(max!)}`

  return (
    <span className="text-xs font-medium text-green-800 dark:text-green-400">
      {range} {currency}
    </span>
  )
}
