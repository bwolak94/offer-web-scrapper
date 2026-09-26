interface PriceTagProps {
  price:     number | null
  currency?: string
  perM2?:    boolean
  areaM2?:   number | null
}

export function PriceTag({ price, currency = 'PLN', perM2 = false, areaM2 }: PriceTagProps) {
  if (price == null) {
    return <span className="text-sm text-muted-foreground">Price on request</span>
  }
  const formatted = price.toLocaleString('pl-PL', { maximumFractionDigits: 0 })
  const perM2Value = perM2 && areaM2 && areaM2 > 0
    ? Math.round(price / areaM2).toLocaleString('pl-PL', { maximumFractionDigits: 0 })
    : null

  return (
    <div className="flex flex-col">
      <span className="text-base font-semibold leading-tight">{formatted} {currency}</span>
      {perM2Value && (
        <span className="text-xs text-muted-foreground">{perM2Value} {currency}/m²</span>
      )}
    </div>
  )
}
