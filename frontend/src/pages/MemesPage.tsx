import { useEffect, useState, type SubmitEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { listImages } from '../api/articles'
import { extractErrorMessage } from '../api/client'
import { MemeGrid } from '../components/MemeGrid'
import { Pagination } from '../components/Pagination'
import type { ArticleImage, Paginated } from '../types'

const PAGE_SIZE = 24

export function MemesPage() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const page = Number(params.get('page') ?? '1') || 1

  const [query, setQuery] = useState(search)
  const [data, setData] = useState<Paginated<ArticleImage> | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    document.title = 'Меми — Енциклопедія богданівських мемів'
    return () => {
      document.title = 'Енциклопедія богданівських мемів'
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    listImages({ search: search || undefined, page, page_size: PAGE_SIZE })
      .then((res) => {
        if (!cancelled) setData(res)
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Не вдалося завантажити меми'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [search, page])

  const onSearch = (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const next = new URLSearchParams()
    if (query.trim()) next.set('search', query.trim())
    setParams(next)
  }

  const goToPage = (p: number) => {
    const next = new URLSearchParams(params)
    next.set('page', String(p))
    setParams(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">
            Меми{data ? <span className="ml-2 text-base font-normal text-stone-500">({data.count})</span> : null}
          </h1>
          <p className="mt-1 text-sm text-stone-500">Усі картинки з галерей статей. Натисніть, щоб переглянути.</p>
        </div>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Пошук за описом, статтею або тегом"
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200 sm:w-72"
          />
          <button type="submit" className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
            Знайти
          </button>
        </form>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-2xl bg-stone-200" />
          ))}
        </div>
      ) : data && data.results.length > 0 ? (
        <MemeGrid images={data.results} />
      ) : (
        !error && (
          <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
            {search ? 'Нічого не знайдено. Спробуйте інший запит.' : 'Мемів поки немає. Додайте зображення до галереї статті.'}
          </div>
        )
      )}

      {data && (
        <Pagination
          page={page}
          totalPages={totalPages}
          hasPrevious={Boolean(data.previous)}
          hasNext={Boolean(data.next)}
          onChange={goToPage}
        />
      )}
    </section>
  )
}
