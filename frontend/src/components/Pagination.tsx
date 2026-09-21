interface PaginationProps {
  page: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  onChange: (page: number) => void
}

export function Pagination({ page, totalPages, hasPrevious, hasNext, onChange }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <nav className="flex items-center justify-center gap-3" aria-label="Пагінація">
      <button
        type="button"
        disabled={!hasPrevious}
        onClick={() => onChange(page - 1)}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40"
      >
        ← Попередня
      </button>
      <span className="text-sm text-stone-600">
        Сторінка {page} з {totalPages}
      </span>
      <button
        type="button"
        disabled={!hasNext}
        onClick={() => onChange(page + 1)}
        className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm disabled:opacity-40"
      >
        Наступна →
      </button>
    </nav>
  )
}
