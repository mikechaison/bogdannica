import { api } from './client'
import { tokenStorage } from './tokens'
import type { AuthTokens, LoginPayload, RegisterPayload, RegisterResult, User } from '../types'

export async function login(payload: LoginPayload): Promise<User> {
  const { data } = await api.post<AuthTokens>('/auth/login/', payload)
  tokenStorage.set(data)
  return fetchMe()
}

/** Files a registration application. No tokens are issued until a superuser approves it. */
export async function register(payload: RegisterPayload): Promise<RegisterResult> {
  const { data } = await api.post<RegisterResult>('/auth/register/', payload)
  return data
}

export async function fetchMe(): Promise<User> {
  const { data } = await api.get<User>('/auth/me/')
  return data
}

export function logout(): void {
  tokenStorage.clear()
}
