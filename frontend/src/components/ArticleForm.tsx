import { useEffect, useMemo, useState, type ChangeEvent, type SubmitEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { createArticle, deleteImage, mediaUrl, updateArticle, updateImage, uploadImage } from '../api/articles'
import { extractErrorMessage } from '../api/client'
import type { Article, ArticleImage } from '../types'
import { FileButton } from './FileButton'
import { MarkdownEditor } from './MarkdownEditor'
import { TagList } from './TagList'

const inputClass =
  'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

interface GalleryDraft {
  id: string
  file: File
  description: string
  preview: string
}

/** Pending changes to an image that already exists on the server. */
interface ExistingEdit {
  description: string
  file: File | null
  preview: string | null
}

type ArticleFormProps = { mode: 'create' } | { mode: 'edit'; article: Article }

export function ArticleForm(props: ArticleFormProps) {
  const navigate = useNavigate()
  const editing = props.mode === 'edit'
  const existing = editing ? props.article : null

  const [title, setTitle] = useState(existing?.title ?? '')
  const [content, setContent] = useState(existing?.content ?? '')
  const [tagsInput, setTagsInput] = useState(existing?.tags.join(', ') ?? '')
  const [cover, setCover] = useState<File | null>(null)
  /** Images already stored on the server (edit mode). Removed ones are deleted on save. */
  const [existingImages, setExistingImages] = useState<ArticleImage[]>(existing?.images ?? [])
  const [existingEdits, setExistingEdits] = useState<Record<number, ExistingEdit>>({})
  const [removedImageIds, setRemovedImageIds] = useState<number[]>([])
  const [gallery, setGallery] = useState<GalleryDraft[]>([])

  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const tags = useMemo(
    () =>
      Array.from(
        new Set(
          tagsInput
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        ),
      ),
    [tagsInput],
  )

  const coverPreview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover])
  useEffect(() => {
    return () => {
      if (coverPreview) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview])

  useEffect(() => {
    return () => {
      gallery.forEach((g) => URL.revokeObjectURL(g.preview))
      Object.values(existingEdits).forEach((e) => {
        if (e.preview) URL.revokeObjectURL(e.preview)
      })
    }
    // Only revoke on unmount; previews for removed/cancelled items are revoked where they are dropped.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentCoverUrl = coverPreview ?? mediaUrl(existing?.image)

  const onCoverChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCover(e.target.files?.[0] ?? null)
  }

  const onGalleryChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const drafts: GalleryDraft[] = files.map((file) => ({
      id: `${file.name}-${file.size}-${crypto.randomUUID()}`,
      file,
      description: '',
      preview: URL.createObjectURL(file),
    }))
    setGallery((prev) => [...prev, ...drafts])
    e.target.value = ''
  }

  const updateGalleryDescription = (id: string, description: string) => {
    setGallery((prev) => prev.map((g) => (g.id === id ? { ...g, description } : g)))
  }

  const replaceGalleryFile = (id: string, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    setGallery((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g
        URL.revokeObjectURL(g.preview)
        return { ...g, file, preview: URL.createObjectURL(file) }
      }),
    )
  }

  const removeGalleryItem = (id: string) => {
    setGallery((prev) => {
      const item = prev.find((g) => g.id === id)
      if (item) URL.revokeObjectURL(item.preview)
      return prev.filter((g) => g.id !== id)
    })
  }

  // --- existing images -----------------------------------------------------

  const editFor = (img: ArticleImage): ExistingEdit =>
    existingEdits[img.id] ?? { description: img.description, file: null, preview: null }

  const updateExistingDescription = (img: ArticleImage, description: string) => {
    setExistingEdits((prev) => ({ ...prev, [img.id]: { ...editFor(img), description } }))
  }

  const replaceExistingFile = (img: ArticleImage, e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    e.target.value = ''
    if (!file) return
    setExistingEdits((prev) => {
      const current = prev[img.id] ?? editFor(img)
      if (current.preview) URL.revokeObjectURL(current.preview)
      return { ...prev, [img.id]: { ...current, file, preview: URL.createObjectURL(file) } }
    })
  }

  const cancelExistingReplace = (img: ArticleImage) => {
    setExistingEdits((prev) => {
      const current = prev[img.id]
      if (!current) return prev
      if (current.preview) URL.revokeObjectURL(current.preview)
      return { ...prev, [img.id]: { ...current, file: null, preview: null } }
    })
  }

  const removeExistingImage = (img: ArticleImage) => {
    cancelExistingReplace(img)
    setExistingImages((prev) => prev.filter((i) => i.id !== img.id))
    setRemovedImageIds((prev) => [...prev, img.id])
  }

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      let article: Article
      if (existing) {
        setProgress('Збереження статті…')
        article = await updateArticle(existing.slug, { title: title.trim(), content, tags, image: cover })
      } else {
        setProgress('Створення статті…')
        article = await createArticle({ title: title.trim(), content, tags, image: cover })
      }

      const failed: string[] = []

      for (const id of removedImageIds) {
        setProgress('Видалення зображень…')
        try {
          await deleteImage(id)
        } catch {
          failed.push(`зображення #${id}`)
        }
      }

      for (const img of existingImages) {
        const edit = existingEdits[img.id]
        if (!edit) continue
        const description = edit.description.trim()
        const descriptionChanged = description !== img.description
        if (!descriptionChanged && !edit.file) continue
        setProgress('Оновлення зображень…')
        try {
          await updateImage(img.id, {
            file: edit.file,
            description: descriptionChanged ? description : undefined,
          })
        } catch {
          failed.push(img.description || `зображення #${img.id}`)
        }
      }

      for (let i = 0; i < gallery.length; i++) {
        const item = gallery[i]
        setProgress(`Завантаження зображення ${i + 1} з ${gallery.length}…`)
        try {
          await uploadImage(article.id, { file: item.file, description: item.description.trim() })
        } catch {
          failed.push(item.file.name)
        }
      }

      if (failed.length) {
        window.alert(`Статтю збережено, але не вдалося обробити: ${failed.join(', ')}`)
      }
      navigate(`/articles/${article.slug}`)
    } catch (err) {
      setError(extractErrorMessage(err, editing ? 'Не вдалося зберегти статтю' : 'Не вдалося створити статтю'))
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">{editing ? 'Редагування статті' : 'Нова стаття'}</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Назва</span>
          <input
            className={inputClass}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва мема"
            maxLength={200}
            required
          />
        </label>

        <div className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Текст статті</span>
          <MarkdownEditor value={content} onChange={setContent} placeholder="Розкажіть історію мема" required />
          <span className="mt-1 block text-xs text-stone-500">
            Форматування у Markdown: жирний, курсив, заголовки, списки, цитати, посилання та зображення.
          </span>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Теги</span>
          <input
            className={inputClass}
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Через кому: класика, школа, 2019"
          />
          <div className="mt-2">
            <TagList tags={tags} />
          </div>
        </label>

        <div className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Обкладинка</span>
          <FileButton
            accept="image/*"
            onChange={onCoverChange}
            hint={cover ? cover.name : existing?.image ? 'Поточна обкладинка' : 'Файл не вибрано'}
          >
            {currentCoverUrl ? 'Замінити обкладинку' : 'Вибрати обкладинку'}
          </FileButton>
          {currentCoverUrl && (
            <div className="mt-3 flex items-start gap-3">
              <img src={currentCoverUrl} alt="Попередній перегляд обкладинки" className="h-32 w-44 rounded-lg object-cover" />
              {cover && (
                <button type="button" onClick={() => setCover(null)} className="text-sm text-red-700 hover:underline">
                  Скасувати заміну
                </button>
              )}
            </div>
          )}
        </div>

        <div className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Галерея зображень</span>
          <FileButton
            accept="image/*"
            multiple
            onChange={onGalleryChange}
            hint={gallery.length ? `Нових зображень: ${gallery.length}` : 'Можна вибрати кілька файлів'}
          >
            Додати зображення
          </FileButton>

          {(existingImages.length > 0 || gallery.length > 0) && (
            <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {existingImages.map((img) => {
                const edit = editFor(img)
                return (
                  <li key={`existing-${img.id}`} className="flex gap-3 rounded-xl border border-stone-200 bg-white p-3">
                    <img
                      src={edit.preview ?? img.resolved_url}
                      alt=""
                      className="h-20 w-20 shrink-0 rounded-lg object-cover"
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-2">
                      <input
                        className={inputClass}
                        value={edit.description}
                        onChange={(e) => updateExistingDescription(img, e.target.value)}
                        placeholder="Опис (необов’язково)"
                        maxLength={500}
                      />
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <FileButton accept="image/*" size="sm" onChange={(e) => replaceExistingFile(img, e)}>
                          Замінити
                        </FileButton>
                        {edit.file && (
                          <button
                            type="button"
                            onClick={() => cancelExistingReplace(img)}
                            className="text-xs text-stone-600 hover:underline"
                          >
                            Скасувати заміну
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => removeExistingImage(img)}
                          className="text-xs text-red-700 hover:underline"
                        >
                          Видалити
                        </button>
                      </div>
                      {edit.file && <p className="truncate text-xs text-stone-500">Новий файл: {edit.file.name}</p>}
                    </div>
                  </li>
                )
              })}
              {gallery.map((item) => (
                <li key={item.id} className="flex gap-3 rounded-xl border border-dashed border-red-300 bg-white p-3">
                  <img src={item.preview} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <input
                      className={inputClass}
                      value={item.description}
                      onChange={(e) => updateGalleryDescription(item.id, e.target.value)}
                      placeholder="Опис (необов’язково)"
                      maxLength={500}
                    />
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <FileButton accept="image/*" size="sm" onChange={(e) => replaceGalleryFile(item.id, e)}>
                        Замінити
                      </FileButton>
                      <button
                        type="button"
                        onClick={() => removeGalleryItem(item.id)}
                        className="text-xs text-red-700 hover:underline"
                      >
                        Прибрати
                      </button>
                    </div>
                    <p className="truncate text-xs text-stone-500">{item.file.name}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="whitespace-pre-line rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            className="rounded-xl bg-red-600 px-6 py-2.5 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? (editing ? 'Збереження…' : 'Публікація…') : editing ? 'Зберегти' : 'Опублікувати'}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => navigate(`/articles/${existing!.slug}`)}
              className="rounded-xl border border-stone-300 px-5 py-2.5 font-medium text-stone-700 hover:bg-stone-100"
            >
              Скасувати
            </button>
          )}
          {progress && <span className="text-sm text-stone-500">{progress}</span>}
        </div>
      </form>
    </div>
  )
}
