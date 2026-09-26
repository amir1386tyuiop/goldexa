/** Authentication state and UI authorization helpers for the Expo client. */

import * as SecureStore from 'expo-secure-store'

export type UserRole =
  | 'buyer'
  | 'seller'
  | 'designer'
  | 'admin'
  | 'expert'
  | 'premium'
  | 'group_buyer'
  | 'customer'

export type Permission = string

export interface AuthUser {
  id: string
  name?: string
  phone?: string
  email?: string
  role?: UserRole | string
  roles?: string[]
  permissions?: Permission[]
  [key: string]: unknown
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  refreshToken?: string
  role?: UserRole | string
  roles: string[]
  permissions: Permission[]
}

export interface OtpRequestResponse {
  phone: string
  otp?: string
  expiresAt?: string
  message?: string
  [key: string]: unknown
}

export interface OtpLoginResponse {
  user: AuthUser
  accessToken: string
  refreshToken?: string
  token?: string
  role?: UserRole | string
  roleNames?: string[]
  permissions?: string[]
  [key: string]: unknown
}

const STORAGE_KEY = 'goldexacode.auth.session'
let memorySession: AuthSession | null = null

type SecureStoreLike = {
  getItemAsync(key: string): Promise<string | null>
  setItemAsync(key: string, value: string): Promise<void>
  deleteItemAsync(key: string): Promise<void>
}

function getSecureStore(): SecureStoreLike {
  return {
    getItemAsync: SecureStore.getItemAsync,
    setItemAsync: SecureStore.setItemAsync,
    deleteItemAsync: SecureStore.deleteItemAsync,
  }
}

export async function getSession(): Promise<AuthSession | null> {
  const storage = getSecureStore()
  try {
    const raw = await storage.getItemAsync(STORAGE_KEY)
    if (!raw) return memorySession
    const parsed = JSON.parse(raw) as AuthSession
    memorySession = parsed
    return parsed
  } catch {
    return memorySession
  }
}

export async function setSession(session: AuthSession): Promise<void> {
  memorySession = session
  const storage = getSecureStore()
  try {
    await storage.setItemAsync(STORAGE_KEY, JSON.stringify(session))
  } catch {
    // Memory remains the safe fallback when persistence is unavailable.
  }
}

export async function clearSession(): Promise<void> {
  memorySession = null
  const storage = getSecureStore()
  try {
    await storage.deleteItemAsync(STORAGE_KEY)
  } catch {
    // Clearing memory still signs the current process out.
  }
}

export function sessionFromLogin(payload: OtpLoginResponse): AuthSession {
  const role = payload.role ?? payload.user.role
  const roles = uniqueStrings([
    ...(payload.roleNames ?? []),
    ...(payload.user.roles ?? []),
    ...(role ? [role] : []),
  ])
  return {
    user: payload.user,
    accessToken: payload.accessToken || payload.token || '',
    refreshToken: payload.refreshToken,
    role,
    roles,
    permissions: uniqueStrings([...(payload.permissions ?? []), ...(payload.user.permissions ?? [])]),
  }
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === 'string' && value.length > 0))]
}

export async function getAccessToken(): Promise<string | null> {
  return (await getSession())?.accessToken ?? null
}

export async function hasRole(role: UserRole | string): Promise<boolean> {
  return (await getSession())?.roles.includes(role) ?? false
}

export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await getSession()
  return Boolean(session && (session.permissions.includes('*') || session.permissions.includes(permission)))
}

export async function canAccess(input: { roles?: string[]; permissions?: Permission[] }): Promise<boolean> {
  const session = await getSession()
  if (!session) return false
  const roleAllowed = !input.roles?.length || input.roles.some((role) => session.roles.includes(role))
  const permissionAllowed = !input.permissions?.length || input.permissions.some(
    (permission) => session.permissions.includes('*') || session.permissions.includes(permission),
  )
  return roleAllowed && permissionAllowed
}

export const uiPermissions = {
  browse: ['catalog:read', 'products:read'],
  cart: ['cart:read', 'cart:write'],
  checkout: ['orders:write'],
  wallet: ['wallet:read'],
  sell: ['seller', 'seller:write'],
  auctions: ['auctions:read'],
  marketplace: ['marketplace:read'],
  escrow: ['escrow:read'],
  smartVault: ['smart-vault:read'],
  admin: ['admin'],
} as const
