'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageGalleryProps {
  images: string[]
  title:  string
}

export function ImageGallery({ images, title }: ImageGalleryProps) {
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  if (images.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-muted">
        <span className="text-sm text-foreground/40">No images</span>
      </div>
    )
  }

  function openAt(i: number) {
    setActiveIndex(i)
    setOpen(true)
  }

  function prev() {
    setActiveIndex((i) => (i - 1 + images.length) % images.length)
  }

  function next() {
    setActiveIndex((i) => (i + 1) % images.length)
  }

  return (
    <>
      {/* Thumbnail grid — first image spans 2 columns + 2 rows */}
      <div className="grid grid-cols-4 gap-2">
        {images.slice(0, 5).map((src, i) => (
          <button
            key={i}
            type="button"
            aria-label={`View photo ${i + 1}`}
            onClick={() => openAt(i)}
            className={`overflow-hidden rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring${i === 0 ? ' col-span-2 row-span-2' : ''}`}
          >
            <AspectRatio ratio={i === 0 ? 4 / 3 : 1}>
              <Image
                src={src}
                alt={`${title} — photo ${i + 1}`}
                fill
                className="object-cover transition-opacity hover:opacity-90"
                sizes={i === 0 ? '(max-width: 768px) 50vw, 400px' : '(max-width: 768px) 25vw, 200px'}
                priority={i === 0}
              />
            </AspectRatio>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-2">
          <div className="relative">
            <AspectRatio ratio={16 / 9}>
              <Image
                src={images[activeIndex]!}
                alt={`${title} — full size`}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
              />
            </AspectRatio>
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous image"
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  aria-label="Next image"
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-1 text-white hover:bg-black/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
          <p className="text-center text-xs text-muted-foreground">
            {activeIndex + 1} / {images.length}
          </p>
        </DialogContent>
      </Dialog>
    </>
  )
}
