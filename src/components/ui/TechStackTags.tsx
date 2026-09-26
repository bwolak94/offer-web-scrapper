import { Badge } from '@/components/ui/badge'

interface TechStackTagsProps {
  tags:     string[]
  maxShow?: number
}

export function TechStackTags({ tags, maxShow = 4 }: TechStackTagsProps) {
  const visible = tags.slice(0, maxShow)
  const rest    = tags.length - maxShow

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
      ))}
      {rest > 0 && (
        <Badge variant="outline" className="text-xs text-muted-foreground">+{rest} more</Badge>
      )}
    </div>
  )
}
