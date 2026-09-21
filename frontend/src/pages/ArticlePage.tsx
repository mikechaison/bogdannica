import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteArticle, getArticle, mediaUrl } from '../api/articles'
import { extractErrorMessage } from '../api/client'
import { CommentSection } from '../components/CommentSection'
import { useConfirm } from '../components/ConfirmDialog'
import { Lightbox, type LightboxItem } from '../components/Lightbox'
import { TagList } from '../components/TagList'
import { useAuth } from '../context/AuthContext'
import { renderMarkdown } from '../lib/markdown'
import type { Article } from '../types'

export function ArticlePage() {
  const { slug = '' } = useParams<{ slug: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  const confirm = useConfirm()

  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    getArticle(slug)
      .then((a) => {
        if (!cancelled) {
          setArticle(a)
          document.title = `${a.title} — Bogdannica`
        }
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Статтю не знайдено'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
      document.title = 'Енциклопедія богданівських мемів'
    }
  }, [slug])

  // Article content is Markdown (legacy HTML also works); rendered and sanitised.
  const safeHtml = useMemo(() => (article ? renderMarkdown(article.content) : ''), [article])

  // Cover first, then gallery — one list for the viewer.
  const lightboxItems = useMemo<LightboxItem[]>(() => {
    if (!article) return []
    const items: LightboxItem[] = []
    const cover = mediaUrl(article.image)
    if (cover) items.push({ src: cover, alt: article.title })
    for (const img of article.images) {
      items.push({ src: img.resolved_url, alt: img.description || article.title, description: img.description })
    }
    return items
  }, [article])

  const canEdit = Boolean(user && article && (user.is_staff || user.id === article.author_id))
  const coverOffset = article && mediaUrl(article.image) ? 1 : 0

  const onDelete = async () => {
    if (!article) return
    const ok = await confirm({
      title: 'Видалити статтю?',
      message: `Статтю «${article.title}» разом з її зображеннями та коментарями буде видалено назавжди.`,
      confirmLabel: 'Видалити',
    })
    if (!ok) return
    setDeleting(true)
    try {
      await deleteArticle(article.slug)
      navigate('/')
    } catch (err) {
      setError(extractErrorMessage(err, 'Не вдалося видалити статтю'))
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="text-center text-stone-500">Завантаження…</p>
  }

  if (error || !article) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error ?? 'Статтю не знайдено'}
        </p>
        <Link to="/" className="text-red-700 hover:underline">
          ← Повернутися до списку
        </Link>
      </div>
    )
  }

  const cover = mediaUrl(article.image)
  const created = new Date(article.created_at).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <article className="mx-auto max-w-3xl">
      <Link to="/" className="text-sm text-red-700 hover:underline">
        ← Усі статті
      </Link>

      <header className="mt-4 space-y-4">
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{article.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-stone-500">
          <span>Автор: {article.author ?? 'Анонім'}</span>
          <time dateTime={article.created_at}>{created}</time>
          {canEdit && (
            <div className="ml-auto flex items-center gap-2">
              <Link
                to={`/articles/${article.slug}/edit`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                  <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
                </svg>
                Редагувати
              </Link>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg border border-stone-300 px-3 py-1.5 text-stone-600 hover:border-red-600 hover:bg-red-600 hover:text-white disabled:opacity-50"
              >
                {deleting ? 'Видалення…' : 'Видалити'}
              </button>
            </div>
          )}
        </div>
        <TagList tags={article.tags} />
      </header>

      {cover && (
        <figure className="my-6 overflow-hidden rounded-2xl bg-red-50">
          <button
            type="button"
            onClick={() => setLightboxIndex(0)}
            className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-red-300"
            aria-label="Відкрити обкладинку у переглядачі"
          >
            <img src={cover} alt={article.title} className="max-h-[480px] w-full object-contain" />
          </button>
        </figure>
      )}

      <div className="article-content" dangerouslySetInnerHTML={{ __html: safeHtml }} />

      {article.images.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-4 text-xl font-bold">Галерея</h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {article.images.map((img, i) => (
              <figure key={img.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(coverOffset + i)}
                  className="block w-full cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-red-300"
                  aria-label={img.description ? `Відкрити: ${img.description}` : 'Відкрити зображення'}
                >
                  <img
                    src={img.resolved_url}
                    alt={img.description || article.title}
                    loading="lazy"
                    className="aspect-square w-full object-cover transition hover:scale-105"
                  />
                </button>
                {img.description && (
                  <figcaption className="px-3 py-2 text-xs text-stone-600">{img.description}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      <CommentSection articleId={article.id} />

      <Lightbox items={lightboxItems} index={lightboxIndex} onChange={setLightboxIndex} onClose={() => setLightboxIndex(null)} />
    </article>
  )
}
