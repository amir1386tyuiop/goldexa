import {
  clearSession,
  getAccessToken,
  getSession,
  sessionFromLogin,
  setSession,
  type AuthSession,
  type OtpLoginResponse,
  type OtpRequestResponse,
  type UserRole,
} from './auth'

export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
export type Query = Record<string, string | number | boolean | null | undefined>

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  query?: Query
  skipAuth?: boolean
  signal?: AbortSignal
}

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(status: number, message: string, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

const API_URL = ((globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process?.env
  ?.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/$/, '')

function buildUrl(path: string, query?: Query): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const params = new URLSearchParams()
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null) params.set(key, String(value))
  })
  const queryString = params.toString()
  return `${API_URL}${normalizedPath}${queryString ? `?${queryString}` : ''}`
}

function errorMessage(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const message = (data as { message?: unknown }).message
    if (typeof message === 'string') return message
    if (Array.isArray(message)) return message.filter((item): item is string => typeof item === 'string').join(', ')
  }
  return 'درخواست با خطا مواجه شد'
}

async function parseResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) return null
  try { return JSON.parse(text) as unknown } catch { return text }
}

async function rawRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const token = options.skipAuth ? null : await getAccessToken()
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (options.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  const response = await fetch(buildUrl(path, options.query), {
    method: options.method ?? 'GET',
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    signal: options.signal,
  })
  const data = await parseResponse(response)
  if (!response.ok) throw new ApiError(response.status, errorMessage(data), data)
  return data as T
}

export async function request<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  try {
    return await rawRequest<T>(path, options)
  } catch (error) {
    if (error instanceof ApiError && error.status === 401 && !options.skipAuth) {
      const session = await getSession()
      if (session?.refreshToken) {
        try {
          const refreshed = await rawRequest<OtpLoginResponse>('/auth/refresh', {
            method: 'POST', body: { refreshToken: session.refreshToken }, skipAuth: true,
          })
          await setSession(sessionFromLogin(refreshed))
          return await rawRequest<T>(path, options)
        } catch {
          await clearSession()
        }
      }
    }
    throw error
  }
}

export const authApi = {
  requestOtp: (phone: string, role: UserRole = 'customer') =>
    request<OtpRequestResponse>('/auth/request-otp', { method: 'POST', body: { phone, role }, skipAuth: true }),
  loginWithOtp: async (phone: string, otp: string, role: UserRole = 'customer'): Promise<AuthSession> => {
    const payload = await request<OtpLoginResponse>('/auth/login', {
      method: 'POST', body: { phone, otp, role }, skipAuth: true,
    })
    const session = sessionFromLogin(payload)
    await setSession(session)
    return session
  },
  logout: clearSession,
  session: getSession,
}

const get = <T>(path: string, query?: Query) => request<T>(path, { query })
const post = <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body })
const patch = <T>(path: string, body?: unknown) => request<T>(path, { method: 'PATCH', body })
const del = <T = void>(path: string) => request<T>(path, { method: 'DELETE' })

export const api = {
  request,
  auth: authApi,
  home: { feed: <T = unknown>() => get<T>('/products/home') },
  catalog: {
    categories: <T = unknown>() => get<T>('/catalog/categories'),
    occasions: <T = unknown>() => get<T>('/catalog/occasions'),
    stones: <T = unknown>() => get<T>('/catalog/stones'),
    sellers: <T = unknown>() => get<T>('/catalog/sellers'),
    media: <T = unknown>(productId: string) => get<T>(`/catalog/products/${productId}/media`),
    inventory: <T = unknown>(productId: string) => get<T>(`/catalog/inventory/${productId}`),
  },
  products: {
    list: <T = unknown>(query?: Query) => get<T>('/products', query),
    get: <T = unknown>(id: string) => get<T>(`/products/${id}`),
  },
  cart: {
    getByUser: <T = unknown>(userId: string) => get<T>(`/cart/user/${userId}`),
    create: <T = unknown>(body: unknown = {}) => post<T>('/cart', body),
    addItem: <T = unknown>(body: unknown) => post<T>('/cart/items', body),
    updateItem: <T = unknown>(id: string, quantity: number) => patch<T>(`/cart/items/${id}/quantity`, { quantity }),
    removeItem: (id: string) => del(`/cart/items/${id}`),
    clear: (cartId: string) => post(`/cart/${cartId}/clear`, {}),
  },
  wallet: {
    get: <T = unknown>(userId: string) => get<T>(`/wallet/user/${userId}`),
    transactions: <T = unknown>(userId: string) => get<T>(`/wallet/user/${userId}/transactions`),
    buyGold: <T = unknown>(body: unknown) => post<T>('/wallet/gold/buy', body),
    sellGold: <T = unknown>(body: unknown) => post<T>('/wallet/gold/sell', body),
  },
  orders: {
    list: <T = unknown>(query?: Query) => get<T>('/orders', query),
    get: <T = unknown>(id: string) => get<T>(`/orders/${id}`),
    create: <T = unknown>(body: unknown) => post<T>('/orders', body),
    cancel: <T = unknown>(id: string, body?: unknown) => post<T>(`/orders/${id}/cancellations`, body),
  },
  auctions: {
    list: <T = unknown>(query?: Query) => get<T>('/auctions', query),
    active: <T = unknown>() => get<T>('/auctions/active'),
    get: <T = unknown>(id: string) => get<T>(`/auctions/${id}`),
    bids: <T = unknown>(id: string) => get<T>(`/auctions/${id}/bids`),
    create: <T = unknown>(body: unknown) => post<T>('/auctions', body),
    bid: <T = unknown>(id: string, body: unknown) => post<T>(`/auctions/${id}/bid`, body),
  },
  marketplace: {
    listings: <T = unknown>(query?: Query) => get<T>('/marketplace/listings', query),
    getListing: <T = unknown>(id: string) => get<T>(`/marketplace/listings/${id}`),
    createListing: <T = unknown>(body: unknown) => post<T>('/marketplace/listings', body),
  },
  escrow: {
    payments: <T = unknown>() => get<T>('/escrow/payments'),
    createPayment: <T = unknown>(body: unknown) => post<T>('/escrow/payments', body),
    ratings: <T = unknown>(userId: string) => get<T>(`/escrow/ratings/user/${userId}`),
  },
  smartVault: {
    assets: <T = unknown>(userId: string) => get<T>(`/smart-vault/assets/user/${userId}`),
    summary: <T = unknown>() => get<T>('/smart-vault/summary'),
    snapshots: <T = unknown>(assetId: string) => get<T>(`/smart-vault/assets/${assetId}/snapshots`),
    alerts: <T = unknown>(userId: string) => get<T>(`/smart-vault/alerts/user/${userId}`),
    createAlert: <T = unknown>(body: unknown) => post<T>('/smart-vault/alerts', body),
  },
  admin: {
    dashboard: <T = unknown>() => get<T>('/admin/dashboard'),
    orders: <T = unknown>(query?: Query) => get<T>('/admin/orders', query),
    products: <T = unknown>(query?: Query) => get<T>('/admin/products', query),
    updateProduct: <T = unknown>(id: string, body: unknown) => patch<T>(`/admin/products/${id}`, body),
    updateOrderStatus: <T = unknown>(id: string, body: unknown) => patch<T>(`/admin/orders/${id}/status`, body),
  },
}

export default api
