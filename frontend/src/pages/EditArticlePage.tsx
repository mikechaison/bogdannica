import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getArticle } from '../api/articles'
import { extractErrorMessage } from '../api/client'
import { ArticleForm } from '../components/ArticleForm'
import { RequireAuth } from '../components/RequireAuth'
import { useAuth } from '../context/AuthContext'
import type { Article } from '../types'

export function EditArticlePage() {
  return (
    <RequireAuth>
      <EditArticleLoader />
    </RequireAuth>
  )
}

function EditArticleLoader() {
  const { slug = '' } = useParams<{ slug: string }>()
  const { user } = useAuth()
  const [article, setArticle] = useState<Article | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setArticle(null)
    setError(null)
    getArticle(slug)
      .then((a) => {
        if (!cancelled) setArticle(a)
      })
      .catch((err) => {
        if (!cancelled) setError(extractErrorMessage(err, 'Статтю не знайдено'))
      })
    return () => {
      cancelled = true
    }
  }, [slug])

  if (error) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
          {error}
        </p>
        <Link to="/" className="text-red-700 hover:underline">
          ← Повернутися до списку
        </Link>
      </div>
    )
  }

  if (!article) {
    return <p className="text-center text-stone-500">Завантаження…</p>
  }

  const canEdit = Boolean(user && (user.is_staff || user.id === article.author_id))
  if (!canEdit) {
    return (
      <div className="mx-auto max-w-lg space-y-4 text-center">
        <p className="rounded-lg bg-red-50 px-4 py-3 text-red-700" role="alert">
          Редагувати цю статтю може лише її автор.
        </p>
        <Link to={`/articles/${article.slug}`} className="text-red-700 hover:underline">
          ← До статті
        </Link>
      </div>
    )
  }

  return <ArticleForm mode="edit" article={article} />
}
