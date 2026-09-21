import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import * as authApi from '../api/auth'
import { AUTH_LOGOUT_EVENT } from '../api/client'
import { tokenStorage } from '../api/tokens'
import type { LoginPayload, RegisterPayload, RegisterResult, User } from '../types'

export type AuthModalMode = 'login' | 'register'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (payload: LoginPayload) => Promise<void>
  /** Files a registration application; the user is NOT signed in until approved. */
  register: (payload: RegisterPayload) => Promise<RegisterResult>
  logout: () => void
  /** Which auth modal is open, if any. */
  modal: AuthModalMode | null
  openModal: (mode: AuthModalMode) => void
  closeModal: () => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState<boolean>(() => Boolean(tokenStorage.getAccess()))
  const [modal, setModal] = useState<AuthModalMode | null>(null)

  // Restore the session on first load if a token is present.
  useEffect(() => {
    if (!tokenStorage.getAccess()) return
    let cancelled = false
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) {
          tokenStorage.clear()
          setUser(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // The Axios client fires this when a refresh fails.
  useEffect(() => {
    const onLogout = () => setUser(null)
    window.addEventListener(AUTH_LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, onLogout)
  }, [])

  const login = useCallback(async (payload: LoginPayload) => {
    const me = await authApi.login(payload)
    setUser(me)
    setModal(null)
  }, [])

  const register = useCallback(async (payload: RegisterPayload) => {
    return authApi.register(payload)
  }, [])

  const logout = useCallback(() => {
    authApi.logout()
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      modal,
      openModal: setModal,
      closeModal: () => setModal(null),
    }),
    [user, loading, login, register, logout, modal],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
