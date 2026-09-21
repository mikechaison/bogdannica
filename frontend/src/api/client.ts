import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios'
import { tokenStorage } from './tokens'
import type { AuthTokens } from '../types'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${API_URL}/api`,
})

/** Fired when the session can no longer be refreshed; AuthContext listens to it. */
export const AUTH_LOGOUT_EVENT = 'bogdannica:logout'

type RetriableConfig = InternalAxiosRequestConfig & { _retry?: boolean }

const AUTH_FREE_PATHS = ['/auth/login/', '/auth/register/', '/auth/token/refresh/']

function isAuthFree(url: string | undefined): boolean {
  return AUTH_FREE_PATHS.some((p) => url?.endsWith(p))
}

// Attach the access token to every request that is not itself an auth call.
api.interceptors.request.use((config) => {
  const access = tokenStorage.getAccess()
  if (access && !isAuthFree(config.url)) {
    config.headers.Authorization = `Bearer ${access}`
  }
  return config
})

// Share one in-flight refresh between concurrent 401s.
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refresh = tokenStorage.getRefresh()
  if (!refresh) throw new Error('No refresh token')
  const { data } = await axios.post<AuthTokens>(`${API_URL}/api/auth/token/refresh/`, { refresh })
  tokenStorage.set(data)
  return data.access
}

// On 401, try to refresh once and replay the original request.
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetriableConfig | undefined

    if (
      error.response?.status !== 401 ||
      !original ||
      original._retry ||
      isAuthFree(original.url) ||
      !tokenStorage.getRefresh()
    ) {
      return Promise.reject(error)
    }

    original._retry = true
    try {
      refreshPromise ??= refreshAccessToken().finally(() => {
        refreshPromise = null
      })
      const access = await refreshPromise
      original.headers.Authorization = `Bearer ${access}`
      return api(original as AxiosRequestConfig)
    } catch (refreshError) {
      tokenStorage.clear()
      window.dispatchEvent(new Event(AUTH_LOGOUT_EVENT))
      return Promise.reject(refreshError)
    }
  },
)

/** Turn a DRF error response into a single human-readable message. */
export function extractErrorMessage(error: unknown, fallback = 'Щось пішло не так'): string {
  if (axios.isAxiosError(error)) {
    const data: unknown = error.response?.data
    if (typeof data === 'string') return data
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>
      if (typeof record.detail === 'string') return record.detail
      const parts: string[] = []
      for (const [field, value] of Object.entries(record)) {
        const messages = Array.isArray(value) ? value.map(String) : [String(value)]
        const label = field === 'non_field_errors' || field === 'detail' ? '' : `${field}: `
        parts.push(`${label}${messages.join(' ')}`)
      }
      if (parts.length) return parts.join('\n')
    }
    if (!error.response) return 'Не вдалося з’єднатися з сервером'
  }
  return fallback
}
