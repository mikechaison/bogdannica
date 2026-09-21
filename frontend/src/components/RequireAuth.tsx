import { useEffect, type ReactNode } from 'react'
import { useAuth } from '../context/AuthContext'

/** Renders children only for signed-in users; otherwise opens the login modal. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, openModal } = useAuth()

  useEffect(() => {
    if (!loading && !user) openModal('login')
  }, [loading, user, openModal])

  if (loading) {
    return <p className="text-center text-stone-500">Завантаження…</p>
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
        <p className="mb-3 font-medium text-red-900">Щоб додати статтю, потрібно увійти.</p>
        <button
          type="button"
          onClick={() => openModal('login')}
          className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-700"
        >
          Увійти
        </button>
      </div>
    )
  }

  return <>{children}</>
}
