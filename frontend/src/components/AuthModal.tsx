import { useState, type SubmitEvent } from 'react'
import { extractErrorMessage } from '../api/client'
import { useAuth, type AuthModalMode } from '../context/AuthContext'
import { Modal } from './Modal'

const inputClass =
  'w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200'

export function AuthModal() {
  const { modal, closeModal, openModal, login, register } = useAuth()
  const mode: AuthModalMode = modal ?? 'login'

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  /** Set after a registration application has been filed successfully. */
  const [applicationSent, setApplicationSent] = useState<string | null>(null)

  const onSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      if (mode === 'login') {
        await login({ username, password })
      } else {
        const result = await register({ username, email, password })
        setApplicationSent(result.detail)
      }
      setUsername('')
      setEmail('')
      setPassword('')
    } catch (err) {
      setError(extractErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  if (applicationSent) {
    return (
      <Modal open={modal !== null} onClose={closeModal} title="Заявку надіслано">
        <div className="space-y-4">
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">
            {applicationSent}
          </p>
          <p className="text-sm text-stone-600">
            Адміністратор отримав вашу заявку на електронну пошту. Після схвалення ви зможете увійти та
            додавати статті.
          </p>
          <button
            type="button"
            onClick={closeModal}
            className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700"
          >
            Зрозуміло
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal open={modal !== null} onClose={closeModal} title={mode === 'login' ? 'Вхід' : 'Реєстрація'}>
      <form onSubmit={onSubmit} className="space-y-4">
        {mode === 'register' && (
          <p className="rounded-lg bg-stone-100 px-3 py-2 text-xs text-stone-600">
            Реєстрація відбувається за заявкою: після заповнення форми адміністратор має її схвалити.
          </p>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Ім’я користувача</span>
          <input
            className={inputClass}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>

        {mode === 'register' && (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-stone-700">Електронна пошта</span>
            <input
              className={inputClass}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </label>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-stone-700">Пароль</span>
          <input
            className={inputClass}
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            minLength={mode === 'register' ? 8 : undefined}
            required
          />
          {mode === 'register' && (
            <span className="mt-1 block text-xs text-stone-500">Щонайменше 8 символів</span>
          )}
        </label>

        {error && (
          <p className="whitespace-pre-line rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-red-600 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:opacity-60"
        >
          {submitting ? 'Зачекайте…' : mode === 'login' ? 'Увійти' : 'Надіслати заявку'}
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-stone-600">
        {mode === 'login' ? (
          <>
            Немає облікового запису?{' '}
            <button type="button" onClick={() => openModal('register')} className="font-medium text-red-700 hover:underline">
              Подати заявку
            </button>
          </>
        ) : (
          <>
            Уже маєте обліковий запис?{' '}
            <button type="button" onClick={() => openModal('login')} className="font-medium text-red-700 hover:underline">
              Увійти
            </button>
          </>
        )}
      </p>
    </Modal>
  )
}
