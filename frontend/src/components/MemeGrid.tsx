import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { ArticleImage } from '../types'
import { Lightbox, type LightboxItem } from './Lightbox'

interface MemeGridProps {
  images: ArticleImage[]
}

/** Grid of gallery images from across the encyclopedia; each opens in the viewer and links to its article. */
export function MemeGrid({ images }: MemeGridProps) {
  const [index, setIndex] = useState<number | null>(null)

  const items = useMemo<LightboxItem[]>(
    () =>
      images.map((img) => ({
        src: img.resolved_url,
        alt: img.description || img.article_title,
        description: img.description,
      })),
    [images],
  )

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {images.map((img, i) => (
          <figure
            key={img.id}
            className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block aspect-square w-full cursor-zoom-in overflow-hidden bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300"
              aria-label={img.description ? `Відкрити: ${img.description}` : 'Відкрити зображення'}
            >
              <img
                src={img.resolved_url}
                alt={img.description || img.article_title}
                loading="lazy"
                className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
              />
            </button>
            <figcaption className="flex flex-1 flex-col gap-1 p-3 text-sm">
              {img.description && <p className="line-clamp-2 text-stone-800">{img.description}</p>}
              <Link
                to={`/articles/${img.article_slug}`}
                className="mt-auto line-clamp-1 text-xs text-stone-500 hover:text-red-700 hover:underline"
              >
                зі статті «{img.article_title}»
              </Link>
            </figcaption>
          </figure>
        ))}
      </div>

      <Lightbox items={items} index={index} onChange={setIndex} onClose={() => setIndex(null)} />
    </>
  )
}
