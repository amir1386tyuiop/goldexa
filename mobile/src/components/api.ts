export type Role = 'buyer' | 'seller' | 'designer' | 'expert' | 'admin'

export type AuthUser = { id: string; name?: string; phone?: string; role: Role }
export type AuthPayload = { user: AuthUser; accessToken: string; refreshToken?: string }

const API_BASE = (globalThis as { EXPO_PUBLIC_API_URL?: string }).EXPO_PUBLIC_API_URL || 'http://localhost:3000'
let auth: AuthPayload | null = null

export function getAuth() { return auth }
export function setAuth(value: AuthPayload | null) { auth = value }

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body) headers.set('Content-Type', 'application/json')
  if (auth?.accessToken) headers.set('Authorization', `Bearer ${auth.accessToken}`)
  const response = await fetch(`${API_BASE}${path}`, { ...init, headers })
  const body = await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.message || 'ارتباط با سرور ناموفق بود')
  return body as T
}

export const mobileApi = {
  requestOtp: (phone: string, role: Role) => request<{ message: string; expiresAt?: string }>('/auth/request-otp', { method: 'POST', body: JSON.stringify({ phone, role }) }),
  login: async (phone: string, otp: string, role: Role) => {
    const payload = await request<AuthPayload>('/auth/login', { method: 'POST', body: JSON.stringify({ phone, otp, role }) })
    setAuth(payload)
    return payload
  },
  products: () => request<{ id: string; name: string; finalPrice: number; weight: number; images?: string[]; sellerName?: string; category?: string }[]>('/products'),
  home: () => request<{ newProducts?: unknown[]; featured?: unknown[]; discounted?: unknown[] }>('/products/home'),
  orders: (userId: string) => request<{ id: string; orderNumber?: string; totalAmount: number; status: string; createdAt: string; items?: unknown[] }[]>(`/orders/user/${userId}`),
  wallet: (userId: string) => request<{ balance: number; goldBalanceGrams: number; isActive: boolean } | null>(`/wallet/user/${userId}`),
  walletTransactions: (userId: string) => request<{ id: string; type: string; amount: number; description?: string; createdAt: string }[]>(`/wallet/user/${userId}/transactions`),
  auctions: () => request<{ id: string; product?: { name?: string; finalPrice?: number; images?: string[] }; status: string; currentPrice: number; bidCount: number; endsAt: string }[]>('/auctions/active'),
  escrow: () => request<{ id: string; amount: number; fee: number; status: string; orderId?: string; auctionId?: string; createdAt: string }[]>('/escrow/payments'),
  adminStats: () => request<Record<string, number | null>>('/admin/stats'),
  adminOrders: () => request<{ id: string; totalAmount: number; status: string; createdAt: string }[]>('/admin/orders?limit=20'),
  sellers: () => request<{ id: string; storeName: string; rating: number; isVerified: boolean }[]>('/catalog/sellers'),
  designs: () => request<{ id: string; name?: string; status?: string; createdAt: string }[]>('/custom-builder/designs'),
  users: () => request<{ id: string; name?: string; role: string; createdAt: string }[]>('/admin/users?limit=20'),
}

