import { Link, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthModal } from './AuthModal'

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-1.5 font-medium ${isActive ? 'bg-red-100 text-red-900' : 'text-stone-600 hover:bg-stone-100'}`

export function Layout() {
  const { user, loading, logout, openModal, modal } = useAuth()

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-red-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight text-stone-900">
            <img src="/coatofarms.png" alt="" className="h-9 w-9 rounded-xl object-cover" aria-hidden="true" />
            <span className="hidden sm:inline">Encyclopedia Bogdannica</span>
          </Link>

          <nav className="flex items-center gap-1 text-sm sm:gap-2">
            <NavLink to="/articles" end className={navLinkClass}>
              Статті
            </NavLink>
            <NavLink to="/memes" className={navLinkClass}>
              Меми
            </NavLink>

            {user ? (
              <>
                <NavLink to="/articles/new" className={navLinkClass}>
                  + Нова стаття
                </NavLink>
                <span className="ml-2 hidden text-stone-500 sm:inline">Привіт, {user.username}</span>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-lg border border-stone-300 px-3 py-1.5 font-medium text-stone-700 hover:bg-stone-100"
                >
                  Вийти
                </button>
              </>
            ) : loading ? (
              <span className="text-stone-400">…</span>
            ) : (
              <button
                type="button"
                onClick={() => openModal('login')}
                className="rounded-lg bg-red-600 px-3 py-1.5 font-semibold text-white hover:bg-red-700"
              >
                Увійти
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-stone-200 py-6 text-center text-sm text-stone-500">
        Encyclopedia Bogdannica · {new Date().getFullYear()}
      </footer>

      {/* Keyed on mode so the form state resets when switching login/register or reopening. */}
      <AuthModal key={modal ?? 'closed'} />
    </div>
  )
}
