import { ArticleForm } from '../components/ArticleForm'
import { RequireAuth } from '../components/RequireAuth'

export function NewArticlePage() {
  return (
    <RequireAuth>
      <ArticleForm mode="create" />
    </RequireAuth>
  )
}
