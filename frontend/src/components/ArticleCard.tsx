import { Link } from 'react-router-dom'
import { mediaUrl } from '../api/articles'
import type { ArticleListItem } from '../types'
import { TagList } from './TagList'

export function ArticleCard({ article }: { article: ArticleListItem }) {
  const image = mediaUrl(article.image)
  const date = new Date(article.created_at).toLocaleDateString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  return (
    <Link
      to={`/articles/${article.slug}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-red-50">
        {image ? (
          <img
            src={image}
            alt={article.title}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-5xl text-red-300" aria-hidden="true">
            🖼
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 text-lg font-bold leading-snug text-stone-900 group-hover:text-red-800">
          {article.title}
        </h3>
        <TagList tags={article.tags} />
        <div className="mt-auto flex items-center justify-between pt-2 text-xs text-stone-500">
          <span>{article.author ?? 'Анонім'}</span>
          <time dateTime={article.created_at}>{date}</time>
        </div>
      </div>
    </Link>
  )
}
