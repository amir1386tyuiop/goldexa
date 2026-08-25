import type { AuthTokenPayload, UserRole } from '@/types'

export const AUTH_STORAGE_KEY = 'goldeksa_auth'

export function getStoredAuth(): AuthTokenPayload | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    const payload = JSON.parse(raw) as Partial<AuthTokenPayload>
    const token = payload.accessToken || payload.token
    if (!token || !payload.user?.id) return null
    return payload as AuthTokenPayload
  } catch {
    return null
  }
}

export function isAuthenticated(): boolean {
  return Boolean(getStoredAuth())
}

export function hasRole(role: UserRole): boolean {
  return getStoredAuth()?.user?.role === role
}

export function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
