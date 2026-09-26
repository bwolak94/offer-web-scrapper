import type { ReactNode } from 'react'

interface MetaTagsProps {
  items: Array<{ icon: ReactNode; label: string }>
}

export function MetaTags({ items }: MetaTagsProps) {
  if (items.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
          {item.icon}
          {item.label}
        </span>
      ))}
    </div>
  )
}
