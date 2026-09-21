import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listArticles, listImages } from '../api/articles'
import { extractErrorMessage } from '../api/client'
import { ArticleCard } from '../components/ArticleCard'
import { MemeGrid } from '../components/MemeGrid'
import { useAuth } from '../context/AuthContext'
import type { ArticleImage, ArticleListItem } from '../types'

const PREVIEW_COUNT = 3

interface SectionHeaderProps {
  title: string
  total: number | null
  to: string
  linkLabel: string
}

function SectionHeader({ title, total, to, linkLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <h2 className="text-2xl font-bold">
        {title}
        {total !== null && <span className="ml-2 text-base font-normal text-stone-500">({total})</span>}
      </h2>
      <Link to={to} className="text-sm font-semibold text-red-700 hover:underline">
        {linkLabel} →
      </Link>
    </div>
  )
}

export function HomePage() {
  const { user, openModal } = useAuth()

  const [articles, setArticles] = useState<ArticleListItem[]>([])
  const [articlesTotal, setArticlesTotal] = useState<number | null>(null)
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [articlesLoading, setArticlesLoading] = useState(true)

  const [memes, setMemes] = useState<ArticleImage[]>([])
  const [memesTotal, setMemesTotal] = useState<number | null>(null)
  const [memesError, setMemesError] = useState<string | null>(null)
  const [memesLoading, setMemesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    listArticles({ page_size: PREVIEW_COUNT })
      .then((res) => {
        if (cancelled) return
        setArticles(res.results)
        setArticlesTotal(res.count)
      })
      .catch((err) => {
        if (!cancelled) setArticlesError(extractErrorMessage(err, 'Не вдалося завантажити статті'))
      })
      .finally(() => {
        if (!cancelled) setArticlesLoading(false)
      })

    listImages({ page_size: PREVIEW_COUNT })
      .then((res) => {
        if (cancelled) return
        setMemes(res.results)
        setMemesTotal(res.count)
      })
      .catch((err) => {
        if (!cancelled) setMemesError(extractErrorMessage(err, 'Не вдалося завантажити меми'))
      })
      .finally(() => {
        if (!cancelled) setMemesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="space-y-12">
      {/* Hero / site description */}
      <section className="flex items-stretch overflow-hidden rounded-3xl bg-gradient-to-br from-red-800 via-red-700 to-rose-600 text-white shadow-lg">
        <div className="flex flex-1 flex-col justify-center px-8 py-6 sm:px-12">
          <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl">Енциклопедія богданівських мемів</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-red-50">
            Це відкрита енциклопедія локальних мемів, легенд і внутрішніх жартів нашої богданівської спільноти.
            Тут зібрано історії про те, звідки взявся кожен мем, хто його автор, як він змінювався з часом
            і чому він досі смішний.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {user ? (
              <Link
                to="/articles/new"
                className="rounded-xl bg-white px-5 py-2.5 font-semibold text-red-800 shadow hover:bg-red-50"
              >
                Додати статтю
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openModal('register')}
                className="rounded-xl bg-white px-5 py-2.5 font-semibold text-red-800 shadow hover:bg-red-50"
              >
                Приєднатися
              </button>
            )}
            <Link
              to="/articles"
              className="rounded-xl border border-white/40 bg-white/10 px-5 py-2.5 font-semibold text-white hover:bg-white/20"
            >
              Переглянути статті
            </Link>
          </div>
        </div>
        {/* The coat of arms defines the hero height: the section stretches to match it. */}
        <img
          src="/coatofarms.png"
          alt="Герб Богданівки"
          className="hidden h-72 w-72 shrink-0 object-cover md:block lg:h-80 lg:w-80"
        />
      </section>

      {/* Latest articles */}
      <section className="space-y-6">
        <SectionHeader title="Статті" total={articlesTotal} to="/articles" linkLabel="Усі статті" />

        {articlesError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
            {articlesError}
          </p>
        )}

        {articlesLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-stone-200" />
            ))}
          </div>
        ) : articles.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard key={article.id} article={article} />
            ))}
          </div>
        ) : (
          !articlesError && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
              Статей поки немає. Станьте першим автором!
            </div>
          )
        )}
      </section>

      {/* Latest memes */}
      <section className="space-y-6">
        <SectionHeader title="Меми" total={memesTotal} to="/memes" linkLabel="Усі меми" />

        {memesError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
            {memesError}
          </p>
        )}

        {memesLoading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {Array.from({ length: PREVIEW_COUNT }).map((_, i) => (
              <div key={i} className="aspect-square animate-pulse rounded-2xl bg-stone-200" />
            ))}
          </div>
        ) : memes.length > 0 ? (
          <MemeGrid images={memes} />
        ) : (
          !memesError && (
            <div className="rounded-2xl border border-dashed border-stone-300 p-12 text-center text-stone-500">
              Мемів поки немає. Додайте зображення до галереї статті.
            </div>
          )
        )}
      </section>
    </div>
  )
}
