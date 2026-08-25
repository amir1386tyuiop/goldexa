import type { ReactNode } from 'react'
import { useState } from 'react'
import { ZoomIn, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ImageGalleryProps {
  images: string[]
  alt: string
  badge?: ReactNode
}

export function ImageGallery({ images, alt, badge }: ImageGalleryProps) {
  const list = images.length ? images : ['/images/ring-1.svg']
  const [selected, setSelected] = useState(list[0])
  const [zoomOpen, setZoomOpen] = useState(false)

  return (
    <>
      <div className="card overflow-hidden p-4 sm:p-6">
        <div className="group relative h-[420px] sm:h-[500px] overflow-hidden rounded-2xl bg-gradient-to-br from-gold-50 via-white to-navy-50">
          <img src={selected} alt={alt} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
          {badge}
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl bg-navy-900/80 px-4 py-2 text-sm font-bold text-white opacity-0 backdrop-blur transition group-hover:opacity-100"
          >
            <ZoomIn className="h-4 w-4" />
            بزرگنمایی
          </button>
        </div>

        {list.length > 1 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {list.map((image) => (
              <button
                key={image}
                type="button"
                onClick={() => setSelected(image)}
                className={cn(
                  'h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl border-2 transition-all',
                  selected === image ? 'border-gold-500 ring-2 ring-gold-200' : 'border-transparent hover:border-gold-300',
                )}
              >
                <img src={image} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {zoomOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm"
          onClick={() => setZoomOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            className="absolute top-6 left-6 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            onClick={() => setZoomOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={selected}
            alt={alt}
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  )
}
