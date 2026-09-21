import { API_URL, api } from './client'
import type { Article, ArticleFormData, ArticleImage, ArticleListItem, NewImage, Paginated } from '../types'

export interface ListParams {
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

export interface ImageListParams {
  search?: string
  page?: number
  page_size?: number
  ordering?: string
}

/** Gallery images across all articles (covers are not included). Newest first. */
export async function listImages(params: ImageListParams = {}): Promise<Paginated<ArticleImage>> {
  const { data } = await api.get<Paginated<ArticleImage>>('/images/', { params })
  return data
}

export async function listArticles(params: ListParams = {}): Promise<Paginated<ArticleListItem>> {
  const { data } = await api.get<Paginated<ArticleListItem>>('/articles/', { params })
  return data
}

export async function getArticle(slug: string): Promise<Article> {
  const { data } = await api.get<Article>(`/articles/${slug}/`)
  return data
}

export async function createArticle(form: ArticleFormData): Promise<Article> {
  const body = new FormData()
  body.append('title', form.title)
  body.append('content', form.content)
  form.tags.forEach((tag) => body.append('tags', tag))
  if (form.image) body.append('image', form.image)
  const { data } = await api.post<Article>('/articles/', body)
  return data
}

export async function updateArticle(slug: string, form: Partial<ArticleFormData>): Promise<Article> {
  const body = new FormData()
  if (form.title !== undefined) body.append('title', form.title)
  if (form.content !== undefined) body.append('content', form.content)
  if (form.tags !== undefined) {
    // An empty string clears the list; omitting the field would leave tags unchanged.
    if (form.tags.length === 0) body.append('tags', '')
    form.tags.forEach((tag) => body.append('tags', tag))
  }
  if (form.image) body.append('image', form.image)
  const { data } = await api.patch<Article>(`/articles/${slug}/`, body)
  return data
}

export async function deleteArticle(slug: string): Promise<void> {
  await api.delete(`/articles/${slug}/`)
}

export async function uploadImage(articleId: number, image: NewImage): Promise<ArticleImage> {
  const body = new FormData()
  body.append('article', String(articleId))
  body.append('file', image.file)
  if (image.description) body.append('description', image.description)
  const { data } = await api.post<ArticleImage>('/images/', body)
  return data
}

export interface ImageChanges {
  file?: File | null
  description?: string
}

export async function updateImage(id: number, changes: ImageChanges): Promise<ArticleImage> {
  const body = new FormData()
  if (changes.file) body.append('file', changes.file)
  if (changes.description !== undefined) body.append('description', changes.description)
  const { data } = await api.patch<ArticleImage>(`/images/${id}/`, body)
  return data
}

export async function deleteImage(id: number): Promise<void> {
  await api.delete(`/images/${id}/`)
}

/** Resolve a possibly-relative media path returned by the backend to an absolute URL. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null
  if (/^https?:\/\//.test(path)) return path
  return `${API_URL}${path.startsWith('/') ? '' : '/'}${path}`
}
