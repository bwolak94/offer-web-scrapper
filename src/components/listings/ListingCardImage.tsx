import Image from 'next/image'

interface ListingCardImageProps {
  src:       string | null
  alt:       string
  priority?: boolean
}

export function ListingCardImage({ src, alt, priority = false }: ListingCardImageProps) {
  if (!src) {
    return (
      <div className="h-full w-32 shrink-0 bg-muted flex items-center justify-center">
        <span className="text-xs text-foreground/40 select-none">No image</span>
      </div>
    )
  }
  return (
    <div className="relative h-full w-32 shrink-0 overflow-hidden">
      <Image src={src} alt={alt} fill className="object-cover" sizes="128px" priority={priority} />
    </div>
  )
}
