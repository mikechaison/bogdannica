import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { ConfirmProvider } from './components/ConfirmDialog'
import { Layout } from './components/Layout'
import { AuthProvider } from './context/AuthContext'
import { ArticlePage } from './pages/ArticlePage'
import { ArticlesPage } from './pages/ArticlesPage'
import { EditArticlePage } from './pages/EditArticlePage'
import { HomePage } from './pages/HomePage'
import { MemesPage } from './pages/MemesPage'
import { NewArticlePage } from './pages/NewArticlePage'
import { NotFoundPage } from './pages/NotFoundPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="articles" element={<ArticlesPage />} />
              <Route path="memes" element={<MemesPage />} />
              <Route path="articles/new" element={<NewArticlePage />} />
              <Route path="articles/:slug" element={<ArticlePage />} />
              <Route path="articles/:slug/edit" element={<EditArticlePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ConfirmProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
