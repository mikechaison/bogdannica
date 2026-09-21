import { useEffect, useState, type SubmitEvent } from 'react'
import { createComment, deleteComment, listComments } from '../api/comments'
import { extractErrorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import type { Comment, User } from '../types'
import { useConfirm } from './ConfirmDialog'

const NAME_KEY = 'bogdannica.commentName'
/** Deeper replies keep nesting logically but stop indenting, so threads stay readable on phones. */
const MAX_INDENT_DEPTH = 4

const inputClass =
  'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

function readSavedName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? ''
  } catch {
    return ''
  }
}

function saveName(name: string): void {
  try {
    if (name) localStorage.setItem(NAME_KEY, name)
    else localStorage.removeItem(NAME_KEY)
  } catch {
    // Storage may be unavailable (private mode); the name simply is not remembered.
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('uk-UA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function canDelete(user: User | null, comment: Comment): boolean {
  return Boolean(user && (user.is_staff || (comment.author_id !== null && comment.author_id === user.id)))
}

// ---------------------------------------------------------------------------
// Tree helpers (immutable updates)
// ---------------------------------------------------------------------------

function addReply(nodes: Comment[], parentId: number, reply: Comment): Comment[] {
  return nodes.map((n) =>
    n.id === parentId
      ? { ...n, replies: [...n.replies, reply] }
      : n.replies.length
        ? { ...n, replies: addReply(n.replies, parentId, reply) }
        : n,
  )
}

function removeNode(nodes: Comment[], id: number): Comment[] {
  return nodes.filter((n) => n.id !== id).map((n) => (n.replies.length ? { ...n, replies: removeNode(n.replies, id) } : n))
}

function countDescendants(node: Comment): number {
  return node.replies.reduce((sum, r) => sum + 1 + countDescendants(r), 0)
}

function containsNode(node: Comment, id: number): boolean {
  return node.replies.some((r) => r.id === id || containsNode(r, id))
}

function pluralReplies(n: number): string {
  const mod10 = n % 10
  const mod100 = n % 100
  if (mod10 === 1 && mod100 !== 11) return `${n} відповідь`
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${n} відповіді`
  return `${n} відповідей`
}

// ---------------------------------------------------------------------------
// Form (shared by the top-level box and inline replies)
// ---------------------------------------------------------------------------

interface CommentFormProps {
  articleId: number
  /** Comment being replied to; omitted for a new thread. */
  parentId?: number
  autoFocus?: boolean
  onCreated: (comment: Comment) => void
  onCancel?: () => void
}

function CommentForm({ articleId, parentId, autoFocus, onCreated, onCancel }: CommentFormProps) {
  const { user } = useAuth()
  const [name, setName] = useState(readSavedName)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const replying = parentId !== undefined

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    const body = text.trim()
    if (!body) {
      setError('Напишіть щось перед відправкою.')
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      const trimmedName = name.trim()
      const created = await createComment({
        article: articleId,
        text: body,
        ...(replying ? { parent: parentId } : {}),
        ...(user ? {} : { author_name: trimmedName }),
      })
      if (!user) saveName(trimmedName)
      setText('')
      onCreated({ ...created, replies: created.replies ?? [] })
    } catch (err) {
      setError(extractErrorMessage(err, 'Не вдалося надіслати коментар'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className={
        replying
          ? 'space-y-2 rounded-xl border border-red-200 bg-red-50/40 p-3'
          : 'space-y-3 rounded-2xl border border-stone-200 bg-white p-4'
      }
    >
      {user ? (
        <p className="text-sm text-stone-600">
          {replying ? 'Відповідаєте як' : 'Ви коментуєте як'}{' '}
          <span className="font-semibold text-stone-800">{user.username}</span>
        </p>
      ) : (
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Ім’я</span>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Анонім"
            maxLength={100}
            autoComplete="nickname"
          />
        </label>
      )}

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-stone-700">{replying ? 'Відповідь' : 'Коментар'}</span>
        <textarea
          className={`${inputClass} ${replying ? 'min-h-20' : 'min-h-24'} resize-y`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={replying ? 'Ваша відповідь' : 'Що скажете?'}
          maxLength={5000}
          autoFocus={autoFocus}
          required
        />
      </label>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
          >
            Скасувати
          </button>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="rounded-xl bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? 'Надсилання…' : replying ? 'Відповісти' : 'Надіслати'}
        </button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// One node of the tree: the comment, its reply form, and its children
// ---------------------------------------------------------------------------

interface CommentNodeProps {
  comment: Comment
  depth: number
  articleId: number
  user: User | null
  replyToId: number | null
  deletingId: number | null
  onReply: (id: number | null) => void
  onReplyCreated: (comment: Comment) => void
  onDelete: (comment: Comment) => void
}

function CommentNode(props: CommentNodeProps) {
  const { comment, depth, articleId, user, replyToId, deletingId, onReply, onReplyCreated, onDelete } = props
  const [collapsed, setCollapsed] = useState(false)
  const replying = replyToId === comment.id
  const hasReplies = comment.replies.length > 0
  const descendants = hasReplies ? countDescendants(comment) : 0
  const indent = depth < MAX_INDENT_DEPTH

  // Expand automatically when a reply form is opened somewhere inside a collapsed thread.
  const replyInside = collapsed && replyToId !== null && containsNode(comment, replyToId)
  useEffect(() => {
    if (replyInside) setCollapsed(false)
  }, [replyInside])

  return (
    <div id={`comment-${comment.id}`}>
      <div className="mb-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
        <span className="font-semibold text-stone-800">{comment.display_name}</span>
        {comment.author_id === null && (
          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500">гість</span>
        )}
        <time dateTime={comment.created_at} className="text-xs text-stone-500">
          {formatDate(comment.created_at)}
        </time>
        <span className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={() => onReply(replying ? null : comment.id)}
            className={`text-xs hover:underline ${replying ? 'text-red-700' : 'text-stone-600 hover:text-red-700'}`}
          >
            {replying ? 'Скасувати' : 'Відповісти'}
          </button>
          {canDelete(user, comment) && (
            <button
              type="button"
              onClick={() => onDelete(comment)}
              disabled={deletingId === comment.id}
              className="text-xs text-red-700 hover:underline disabled:opacity-50"
            >
              {deletingId === comment.id ? 'Видалення…' : 'Видалити'}
            </button>
          )}
        </span>
      </div>
      <p className="whitespace-pre-wrap break-words text-stone-800">{comment.text}</p>

      {replying && (
        <div className="mt-3">
          <CommentForm
            articleId={articleId}
            parentId={comment.id}
            autoFocus
            onCreated={onReplyCreated}
            onCancel={() => onReply(null)}
          />
        </div>
      )}

      {hasReplies && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-red-700"
            aria-expanded={!collapsed}
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform ${collapsed ? '-rotate-90' : ''}`}
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z" />
            </svg>
            {collapsed ? `Показати ${pluralReplies(descendants)}` : `Сховати ${pluralReplies(descendants)}`}
          </button>

          {!collapsed && (
            <ul className={`mt-2 space-y-3 ${indent ? 'border-l-2 border-stone-200 pl-4' : 'border-t border-stone-100 pt-3'}`}>
              {comment.replies.map((reply) => (
                <li key={reply.id}>
                  <CommentNode {...props} comment={reply} depth={depth + 1} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Section
// ---------------------------------------------------------------------------

interface CommentSectionProps {
  articleId: number
}

export function CommentSection({ articleId }: CommentSectionProps) {
  const { user } = useAuth()
  const confirm = useConfirm()

  const [comments, setComments] = useState<Comment[]>([])
  const [count, setCount] = useState(0)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [replyToId, setReplyToId] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    setComments([])
    setPage(1)
    setReplyToId(null)
    listComments(articleId, 1)
      .then((data) => {
        if (cancelled) return
        setComments(data.results)
        setCount(data.count)
        setHasMore(Boolean(data.next))
      })
      .catch((err) => {
        if (!cancelled) setLoadError(extractErrorMessage(err, 'Не вдалося завантажити коментарі'))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [articleId])

  const loadMore = async () => {
    const nextPage = page + 1
    setLoading(true)
    try {
      const data = await listComments(articleId, nextPage)
      setComments((prev) => {
        const seen = new Set(prev.map((c) => c.id))
        return [...prev, ...data.results.filter((c) => !seen.has(c.id))]
      })
      setCount(data.count)
      setHasMore(Boolean(data.next))
      setPage(nextPage)
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'Не вдалося завантажити коментарі'))
    } finally {
      setLoading(false)
    }
  }

  const onRootCreated = (created: Comment) => {
    setComments((prev) => [created, ...prev])
    setCount((n) => n + 1)
  }

  const onReplyCreated = (created: Comment) => {
    if (created.parent !== null) setComments((prev) => addReply(prev, created.parent!, created))
    setReplyToId(null)
  }

  const onDelete = async (comment: Comment) => {
    const descendants = countDescendants(comment)
    const ok = await confirm({
      title: 'Видалити коментар?',
      message:
        descendants > 0
          ? `Разом з ним буде видалено ${pluralReplies(descendants)}. Цю дію не можна скасувати.`
          : 'Цю дію не можна скасувати.',
      confirmLabel: 'Видалити',
    })
    if (!ok) return

    setDeletingId(comment.id)
    try {
      await deleteComment(comment.id)
      setComments((prev) => removeNode(prev, comment.id))
      if (comment.parent === null) setCount((n) => Math.max(0, n - 1))
      if (replyToId !== null && (replyToId === comment.id || containsNode(comment, replyToId))) setReplyToId(null)
    } catch (err) {
      setLoadError(extractErrorMessage(err, 'Не вдалося видалити коментар'))
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className="mt-12 border-t border-stone-200 pt-8" aria-labelledby="comments-heading">
      <h2 id="comments-heading" className="mb-4 text-xl font-bold">
        Коментарі{count > 0 && <span className="ml-2 text-base font-medium text-stone-500">{count}</span>}
      </h2>

      <CommentForm articleId={articleId} onCreated={onRootCreated} />

      <div className="mt-6 space-y-4">
        {loadError && (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {loadError}
          </p>
        )}

        {!loading && !loadError && comments.length === 0 && (
          <p className="text-sm text-stone-500">Коментарів поки немає. Будьте першими!</p>
        )}

        <ul className="space-y-4">
          {comments.map((c) => (
            <li key={c.id} className="rounded-2xl border border-stone-200 bg-white p-4">
              <CommentNode
                comment={c}
                depth={0}
                articleId={articleId}
                user={user}
                replyToId={replyToId}
                deletingId={deletingId}
                onReply={setReplyToId}
                onReplyCreated={onReplyCreated}
                onDelete={onDelete}
              />
            </li>
          ))}
        </ul>

        {loading && <p className="text-center text-sm text-stone-500">Завантаження…</p>}

        {hasMore && !loading && (
          <div className="text-center">
            <button
              type="button"
              onClick={loadMore}
              className="rounded-xl border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 hover:bg-stone-100"
            >
              Показати ще
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
