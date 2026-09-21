export interface User {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  date_joined: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
}

export interface RegisterResult {
  detail: string
  user: User
  status: 'pending' | 'approved' | 'rejected'
}

export interface LoginPayload {
  username: string
  password: string
}

export interface ArticleImage {
  id: number
  article: number
  article_slug: string
  article_title: string
  file: string | null
  url: string
  description: string
  resolved_url: string
  created_at: string
}

export interface ArticleListItem {
  id: number
  title: string
  slug: string
  image: string | null
  tags: string[]
  author: string | null
  author_id: number | null
  created_at: string
  updated_at: string
}

export interface Article extends ArticleListItem {
  content: string
  images: ArticleImage[]
}

export interface Paginated<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

export interface ArticleFormData {
  title: string
  content: string
  tags: string[]
  image: File | null
}

export interface NewImage {
  file: File
  description: string
}

export interface Comment {
  id: number
  article: number
  /** Id of the comment this one replies to, or null for a top-level comment. */
  parent: number | null
  text: string
  author_name: string
  author_id: number | null
  display_name: string
  created_at: string
  /** Nested replies, each carrying its own replies. */
  replies: Comment[]
}

export interface NewComment {
  article: number
  text: string
  author_name?: string
  parent?: number
}
