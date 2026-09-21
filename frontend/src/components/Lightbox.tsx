import { useCallback, useEffect } from 'react'

export interface LightboxItem {
  src: string
  alt: string
  description?: string
}

interface LightboxProps {
  items: LightboxItem[]
  /** Index of the open item, or null when closed. */
  index: number | null
  onChange: (index: number) => void
  onClose: () => void
}

export function Lightbox({ items, index, onChange, onClose }: LightboxProps) {
  const open = index !== null && items.length > 0
  const count = items.length

  const goPrev = useCallback(() => {
    if (index === null) return
    onChange((index - 1 + count) % count)
  }, [index, count, onChange])

  const goNext = useCallback(() => {
    if (index === null) return
    onChange((index + 1) % count)
  }, [index, count, onChange])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowLeft') goPrev()
      else if (e.key === 'ArrowRight') goNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose, goPrev, goNext])

  if (!open || index === null) return null
  const item = items[index]
  const hasMany = count > 1

  const navButtonClass =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur transition hover:bg-white/25 focus:outline-none focus:ring-2 focus:ring-white/60'

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white"
      role="dialog"
      aria-modal="true"
      aria-label={item.description || item.alt}
      onMouseDown={onClose}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-sm text-white/70" onMouseDown={(e) => e.stopPropagation()}>
        <span>{hasMany ? `${index + 1} / ${count}` : ''}</span>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
          aria-label="Закрити"
        >
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </div>

      {/* Image + caption. The image is capped by the viewport so nothing needs to scroll:
          full height minus the top bar and room for the caption. */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center px-14 pb-6">
        <figure
          className="flex max-w-[min(90vw,72rem)] flex-col items-center gap-3"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <img
            key={item.src}
            src={item.src}
            alt={item.alt}
            className="h-auto max-h-[calc(100vh-11rem)] w-auto max-w-full select-none rounded-lg object-contain shadow-2xl"
          />
          {item.description && (
            <figcaption className="max-w-3xl text-center text-sm leading-relaxed text-white/90">
              {item.description}
            </figcaption>
          )}
        </figure>

        {hasMany && (
          <>
            <button
              type="button"
              onClick={goPrev}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${navButtonClass} left-3`}
              aria-label="Попереднє зображення"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M15 6l-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={goNext}
              onMouseDown={(e) => e.stopPropagation()}
              className={`${navButtonClass} right-3`}
              aria-label="Наступне зображення"
            >
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}
