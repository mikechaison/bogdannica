import { api } from './client'
import type { Comment, NewComment, Paginated } from '../types'

export async function listComments(articleId: number, page = 1): Promise<Paginated<Comment>> {
  const { data } = await api.get<Paginated<Comment>>('/comments/', { params: { article: articleId, page } })
  return data
}

export async function createComment(payload: NewComment): Promise<Comment> {
  const { data } = await api.post<Comment>('/comments/', payload)
  return data
}

export async function deleteComment(id: number): Promise<void> {
  await api.delete(`/comments/${id}/`)
}
