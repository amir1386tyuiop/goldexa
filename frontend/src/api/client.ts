import type {
  AdCampaign,
  AiDesignRecommendation,
  AiMarketMatch,
  AiPricePrediction,
  AiProviderPublicConfig,
  AiRunResult,
  AiServiceMetric,
  RunAiTaskInput,
  ArModel,
  ArPreview,
  AuditLog,
  AuthTokenPayload,
  Auction,
  AuctionBid,
  BidIncrementType,
  BuyerRequest,
  Cart,
  CartItem,
  ChallengeReward,
  ContentPage,
  CustomBuilderQuote,
  DesignSave,
  DiscountCode,
  EscrowPayment,
  EventLog,
  GemstoneLibrary,
  GoldPrice,
  GroupBuyingGroup,
  GroupBuyingPaymentMode,
  Invoice,
  Inventory,
  JewelryDesign,
  JewelryDesignVersion,
  KycProfile,
  LaborCostRule,
  LiquidityRequest,
  MarketplaceRating,
  Notification,
  NotificationPreference,
  OccasionCategory,
  Order,
  OrderCancellation,
  OrderStatusHistory,
  OrderTrackingEvent,
  OtpResponse,
  OtpSession,
  Permission,
  PaymentTransaction,
  PriceAlert,
  PriceAlertTargetType,
  PricingRule,
  PricingSpread,
  ProductCategoryMaster,
  ProductMedia,
  ProductStone,
  ProductCategory,
  Product,
  Promotion,
  PublicProfile,
  Refund,
  Role,
  SellRecommendation,
  SellerProfile,
  Shipment,
  SmartVaultAsset,
  Stone,
  SubscriptionPlan,
  SystemSetting,
  TaxRule,
  UsedGoldListing,
  UsedGoldSource,
  User,
  UserRole,
  UserAddress,
  UserBadge,
  UserBankAccount,
  UserFollow,
  UserProfile,
  Wallet,
  WalletTransaction,
} from '@/types'

const API_BASE = import.meta.env.VITE_API_URL || '/api'
const AUTH_STORAGE_KEY = 'goldeksa_auth'

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
  skipAuth?: boolean
}

function getAuthPayload(): AuthTokenPayload | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as AuthTokenPayload
  } catch {
    return null
  }
}

function setAuthPayload(payload: AuthTokenPayload) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(payload))
}

function clearAuthPayload() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

function authHeaders(): Record<string, string> {
  const payload = getAuthPayload()
  const token = payload?.accessToken || payload?.refreshToken || payload?.token

  return token ? { Authorization: `Bearer ${token}` } : {}
}

export interface PaginatedProducts {
  items: Product[]
  total: number
  pages: number
  page: number
}

export interface GoldPricingStatus {
  source: string
  lastFetchAt: string | null
  refreshIntervalSeconds: number
  cacheTtlSeconds: number
  cacheDriver: string
}

export interface ProductsHomeFeed {
  newProducts: Product[]
  featured: Product[]
  discounted: Product[]
}

type ProductCategoryValue = ProductCategory

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function toStringValue(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : value === undefined || value === null ? fallback : String(value)
}

function toNullableString(value: unknown): string | null | undefined {
  if (value === null) return null
  return typeof value === 'string' ? value : undefined
}

function toOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : undefined
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') return value === 'true' || value === '1'
  if (typeof value === 'number') return value !== 0
  return fallback
}

function toProductCategory(value: unknown): ProductCategoryValue {
  const category = toStringValue(value).toLowerCase()
  return ['ring', 'necklace', 'bracelet', 'earring', 'pendant', 'custom'].includes(category)
    ? category as ProductCategoryValue
    : 'custom'
}

function normalizeImages(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function normalizeSeller(value: unknown): Product['seller'] {
  if (!isRecord(value)) return undefined
  return {
    id: toStringValue(value.id),
    name: toStringValue(value.name, 'فروشنده'),
    rating: toNumber(value.rating),
    location: toStringValue(value.location),
  }
}

async function fetchProductsPaginated(params?: Record<string, string>): Promise<PaginatedProducts> {
  const query = params
    ? `?${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value))).toString()}`
    : ''
  const headers: Record<string, string> = { ...authHeaders() }
  const response = await fetch(`${API_BASE}/products${query}`, { headers })
  const data = await response.json().catch(() => [])
  if (!response.ok) {
    throw new ApiError(response.status, (data as { message?: string })?.message || 'درخواست با خطا مواجه شد')
  }
  const items = Array.isArray(data) ? data.map((item) => normalizeProduct(item as Record<string, unknown>)) : []
  return {
    items,
    total: Number(response.headers.get('X-Total-Count') || items.length),
    pages: Number(response.headers.get('X-Total-Pages') || 1),
    page: Number(response.headers.get('X-Page') || 1),
  }
}

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
  }
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    ...(!options.skipAuth ? authHeaders() : {}),
  }

  if (options.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await response.json().catch(() => null)

  if (response.status === 401 && !options.skipAuth && getAuthPayload()?.refreshToken) {
    try {
      const refreshed = await request<AuthTokenPayload>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: getAuthPayload()?.refreshToken },
        skipAuth: true,
      })
      setAuthPayload(refreshed)
      const retryResponse = await fetch(`${API_BASE}${path}`, {
        method: options.method || 'GET',
        headers: { ...authHeaders(), ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })
      const retryData = await retryResponse.json().catch(() => null)
      if (!retryResponse.ok) {
        clearAuthPayload()
        throw new ApiError(retryResponse.status, retryData?.message || 'نشست شما منقضی شده است')
      }
      return normalizeApiResponse(retryData, path) as T
    } catch (error) {
      clearAuthPayload()
      throw error
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, data?.message || 'درخواست با خطا مواجه شد')
  }

  return normalizeApiResponse(data, path) as T
}

export async function requestOtp(phone: string, role: UserRole): Promise<OtpResponse> {
  return request<OtpResponse>('/auth/request-otp', { method: 'POST', body: { phone, role } })
}

export async function loginWithOtp(phone: string, otp: string, role: UserRole): Promise<AuthTokenPayload> {
  const payload = await request<AuthTokenPayload>('/auth/login', { method: 'POST', body: { phone, otp, role } })
  setAuthPayload(payload)
  return payload
}

export async function refreshToken(refreshTokenValue: string): Promise<AuthTokenPayload> {
  const payload = await request<AuthTokenPayload>('/auth/refresh', {
    method: 'POST',
    body: { refreshToken: refreshTokenValue },
    skipAuth: true,
  })
  setAuthPayload(payload)
  return payload
}

export async function registerUser(body: { name: string; phone: string; email?: string; role?: UserRole }) {
  return request<User>('/users', { method: 'POST', body })
}

export async function getCategories(): Promise<ProductCategoryMaster[]> {
  return request<ProductCategoryMaster[]>('/catalog/categories')
}

export async function getOccasions(): Promise<OccasionCategory[]> {
  return request<OccasionCategory[]>('/catalog/occasions')
}

export async function getProductMedia(productId: string): Promise<ProductMedia[]> {
  return request<ProductMedia[]>(`/catalog/products/${productId}/media`)
}

export async function getStones(): Promise<Stone[]> {
  return request<Stone[]>('/catalog/stones')
}

export async function getProductStones(productId: string): Promise<ProductStone[]> {
  return request<ProductStone[]>(`/catalog/products/${productId}/stones`)
}

export async function getInventory(productId: string): Promise<Inventory> {
  return request<Inventory>(`/catalog/inventory/${productId}`)
}

export async function getSellers(): Promise<SellerProfile[]> {
  return request<SellerProfile[]>('/catalog/sellers')
}

export async function getCart(userId: string): Promise<Cart | null> {
  return request<Cart | null>(`/cart/user/${userId}`)
}

export async function addCartItem(body: unknown): Promise<CartItem> {
  return request<CartItem>('/cart/items', { method: 'POST', body })
}

export async function updateCartItemQuantity(id: string, quantity: number): Promise<CartItem> {
  return request<CartItem>(`/cart/items/${id}/quantity`, { method: 'PATCH', body: { quantity } })
}

export async function removeCartItem(id: string): Promise<void> {
  await request<void>(`/cart/items/${id}`, { method: 'DELETE' })
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  return request<Wallet | null>(`/wallet/user/${userId}`)
}

export async function getWalletTransactions(userId: string): Promise<WalletTransaction[]> {
  return request<WalletTransaction[]>(`/wallet/user/${userId}/transactions`)
}

export async function getPricingRules(): Promise<PricingRule[]> {
  return request<PricingRule[]>('/pricing/rules')
}

export async function getPricingSpreads(): Promise<PricingSpread[]> {
  return request<PricingSpread[]>('/pricing/spreads')
}

export async function getTaxRules(): Promise<TaxRule[]> {
  return request<TaxRule[]>('/pricing/tax')
}

export async function getLaborCostRules(): Promise<LaborCostRule[]> {
  return request<LaborCostRule[]>('/pricing/labor')
}

export async function calculatePrice(category: string, goldWeight: number, rawGoldPrice: number): Promise<unknown> {
  return request<unknown>(`/pricing/calculate/${category}`, { method: 'POST', body: { goldWeight, rawGoldPrice } })
}

export async function getLiquidityRequests(userId: string): Promise<LiquidityRequest[]> {
  return request<LiquidityRequest[]>(`/liquidity/requests/user/${userId}`)
}

export async function createLiquidityRequest(body: unknown): Promise<LiquidityRequest> {
  return request<LiquidityRequest>('/liquidity/requests', { method: 'POST', body })
}

export async function getSellRecommendations(userId: string): Promise<SellRecommendation[]> {
  return request<SellRecommendation[]>(`/liquidity/recommendations/user/${userId}`)
}

export async function getBuyerRequests(): Promise<BuyerRequest[]> {
  return request<BuyerRequest[]>('/liquidity/buyer-requests')
}

export async function getArModels(): Promise<ArModel[]> {
  return request<ArModel[]>('/ar/models')
}

export async function getArPreviews(modelId: string): Promise<ArPreview[]> {
  return request<ArPreview[]>(`/ar/models/${modelId}/previews`)
}

export async function getContentPages(): Promise<ContentPage[]> {
  return request<ContentPage[]>('/content/pages')
}

export async function getPromotions(): Promise<Promotion[]> {
  return request<Promotion[]>('/content/promotions')
}

export async function getAdCampaigns(): Promise<AdCampaign[]> {
  return request<AdCampaign[]>('/content/ads')
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return request<AuditLog[]>('/audit/logs')
}

export async function getEventLogs(): Promise<EventLog[]> {
  return request<EventLog[]>('/audit/events')
}

export async function getSystemSettings(): Promise<SystemSetting[]> {
  return request<SystemSetting[]>('/audit/settings')
}

export async function getNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
  return request<NotificationPreference | null>(`/audit/notification-preferences/${userId}`)
}

export async function getUserFollows(userId: string): Promise<UserFollow[]> {
  return request<UserFollow[]>(`/community-extensions/follows/${userId}`)
}

export async function getUserSaves(userId: string): Promise<DesignSave[]> {
  return request<DesignSave[]>(`/community-extensions/saves/${userId}`)
}

export async function getUserBadges(userId: string): Promise<UserBadge[]> {
  return request<UserBadge[]>(`/community-extensions/badges/${userId}`)
}

export async function getChallengeRewards(challengeId: string): Promise<ChallengeReward[]> {
  return request<ChallengeReward[]>(`/community-extensions/challenge-rewards/${challengeId}`)
}

export async function getOrderStatusHistory(orderId: string): Promise<OrderStatusHistory[]> {
  return request<OrderStatusHistory[]>(`/orders/${orderId}/status-history`)
}

export async function getOrderShipments(orderId: string): Promise<Shipment[]> {
  return request<Shipment[]>(`/orders/${orderId}/shipments`)
}

export async function getOrderInvoices(orderId: string): Promise<Invoice[]> {
  return request<Invoice[]>(`/orders/${orderId}/invoices`)
}

export async function getOrderRefunds(orderId: string): Promise<Refund[]> {
  return request<Refund[]>(`/orders/${orderId}/refunds`)
}

export async function getOrderCancellations(orderId: string): Promise<OrderCancellation[]> {
  return request<OrderCancellation[]>(`/orders/${orderId}/cancellations`)
}

export async function getOtpSessions(userId: string): Promise<OtpSession[]> {
  return request<OtpSession[]>(`/users/${userId}/otp-sessions`)
}

export async function getKycProfile(userId: string): Promise<KycProfile | null> {
  return request<KycProfile | null>(`/users/${userId}/kyc`)
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return request<UserProfile | null>(`/users/${userId}/profile`)
}

export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  return request<UserAddress[]>(`/users/${userId}/addresses`)
}

export async function getUserBankAccounts(userId: string): Promise<UserBankAccount[]> {
  return request<UserBankAccount[]>(`/users/${userId}/bank-accounts`)
}

export async function getPublicProfile(userId: string): Promise<PublicProfile | null> {
  return request<PublicProfile | null>(`/users/${userId}/public-profile`)
}

function normalizeApiResponse(data: unknown, path: string): unknown {
  if (Array.isArray(data)) {
    if (path.includes('gold-pricing')) return data.map(normalizeGoldPrice)
    if (path.includes('products')) return data.map(normalizeProduct)
    if (path.includes('auctions')) return data.map(normalizeAuction)
    if (path.includes('auction-bids') || path.endsWith('/bids')) return data.map(normalizeAuctionBid)
    if (path.includes('marketplace/listings')) return data.map(normalizeUsedGoldListing)
    if (path.includes('smart-vault/assets')) return data.map(normalizeSmartVaultAsset)
    if (path.includes('smart-vault/snapshots')) return data.map(normalizeAssetSnapshot)
    if (path.includes('smart-vault/alerts')) return data.map(normalizePriceAlert)
    if (path.includes('group-buying')) return data.map(normalizeGroupBuyingGroup)
    if (path.includes('subscriptions/plans')) return data.map(normalizeSubscriptionPlan)
    if (path.includes('subscriptions/discounts')) return data.map(normalizeDiscountCode)
    if (path.includes('notifications')) return data.map(normalizeNotification)
    if (path.includes('custom-builder/designs')) return data.map(normalizeJewelryDesign)
    if (path.includes('custom-builder/gemstones')) return data.map(normalizeGemstone)
    if (path.includes('custom-builder/quotes')) return data.map(normalizeCustomBuilderQuote)
    if (path.includes('ai-engine/predictions')) return data.map(normalizeAiPricePrediction)
    if (path.includes('ai-engine/recommendations')) return data.map(normalizeAiDesignRecommendation)
    if (path.includes('ai-engine/matches')) return data.map(normalizeAiMarketMatch)
    if (path.includes('ai-engine/metrics')) return data.map(normalizeAiServiceMetric)
    if (path.includes('escrow/payments')) return data.map(normalizeEscrowPayment)
    if (path.includes('escrow/ratings')) return data.map(normalizeMarketplaceRating)
    if (path.includes('payments/transactions')) return data.map(normalizePaymentTransaction)
    if (path.includes('tracking')) return data.map(normalizeOrderTrackingEvent)
    if (path.includes('catalog/categories')) return data.map(normalizeProductCategory)
    if (path.includes('catalog/occasions')) return data.map(normalizeOccasionCategory)
    if (path.includes('catalog/products') && path.includes('media')) return data.map(normalizeProductMedia)
    if (path.includes('catalog/stones')) return data.map(normalizeStone)
    if (path.includes('catalog/products') && path.includes('stones')) return data.map(normalizeProductStone)
    if (path.includes('catalog/inventory')) return data.map(normalizeInventory)
    if (path.includes('catalog/sellers')) return data.map(normalizeSellerProfile)
    if (path.includes('cart/items')) return data.map(normalizeCartItem)
    if (path.includes('wallet/user') && path.includes('transactions')) return data.map(normalizeWalletTransaction)
    if (path.includes('pricing/rules')) return data.map(normalizePricingRule)
    if (path.includes('pricing/spreads')) return data.map(normalizePricingSpread)
    if (path.includes('pricing/tax')) return data.map(normalizeTaxRule)
    if (path.includes('pricing/labor')) return data.map(normalizeLaborCostRule)
    if (path.includes('liquidity/requests')) return data.map(normalizeLiquidityRequest)
    if (path.includes('liquidity/recommendations')) return data.map(normalizeSellRecommendation)
    if (path.includes('liquidity/buyer-requests')) return data.map(normalizeBuyerRequest)
    if (path.includes('ar/models')) return data.map(normalizeArModel)
    if (path.includes('ar/previews')) return data.map(normalizeArPreview)
    if (path.includes('content/pages')) return data.map(normalizeContentPage)
    if (path.includes('content/promotions')) return data.map(normalizePromotion)
    if (path.includes('content/ads')) return data.map(normalizeAdCampaign)
    if (path.includes('audit/logs')) return data.map(normalizeAuditLog)
    if (path.includes('audit/events')) return data.map(normalizeEventLog)
    if (path.includes('audit/settings')) return data.map(normalizeSystemSetting)
    if (path.includes('audit/notification-preferences')) return data.map(normalizeNotificationPreference)
    if (path.includes('users/otp-sessions')) return data.map(normalizeOtpSession)
    if (path.includes('users/kyc')) return data.map(normalizeKycProfile)
    if (path.includes('users/profile')) return data.map(normalizeUserProfile)
    if (path.includes('users/addresses')) return data.map(normalizeUserAddress)
    if (path.includes('users/bank-accounts')) return data.map(normalizeUserBankAccount)
    if (path.includes('users/public-profile')) return data.map(normalizePublicProfile)
    if (path.includes('community-extensions/follows')) return data.map(normalizeUserFollow)
    if (path.includes('community-extensions/saves')) return data.map(normalizeDesignSave)
    if (path.includes('community-extensions/badges')) return data.map(normalizeUserBadge)
    if (path.includes('community-extensions/challenge-rewards')) return data.map(normalizeChallengeReward)
    if (path.includes('/status-history')) return data.map(normalizeOrderStatusHistory)
    if (path.includes('/shipments')) return data.map(normalizeShipment)
    if (path.includes('/invoices')) return data.map(normalizeInvoice)
    if (path.includes('/refunds')) return data.map(normalizeRefund)
    if (path.includes('/cancellations')) return data.map(normalizeOrderCancellation)
    if (path.includes('orders')) return data.map(normalizeOrder)
    return data
  }

  if (!data || typeof data !== 'object') return data

  if (path.includes('/products/home')) return normalizeProductsHomeFeed(data as Record<string, unknown>)

  if (path.includes('gold-pricing')) return normalizeGoldPrice(data as Record<string, unknown>)
  if (path.includes('products')) return normalizeProduct(data as Record<string, unknown>)
  if (path.includes('auctions') && !path.includes('bids')) return normalizeAuction(data as Record<string, unknown>)
  if (path.includes('/bids') || path.endsWith('/bids')) return normalizeAuctionBid(data as Record<string, unknown>)
  if (path.includes('marketplace/listings')) return normalizeUsedGoldListing(data as Record<string, unknown>)
  if (path.includes('smart-vault/assets')) return normalizeSmartVaultAsset(data as Record<string, unknown>)
  if (path.includes('smart-vault/snapshots')) return normalizeAssetSnapshot(data as Record<string, unknown>)
  if (path.includes('smart-vault/alerts')) return normalizePriceAlert(data as Record<string, unknown>)
  if (path.includes('group-buying') && typeof (data as Record<string, unknown>).group === 'object') {
    const groupData = (data as Record<string, unknown>).group as Record<string, unknown>
    const items = Array.isArray((data as Record<string, unknown>).items)
      ? ((data as Record<string, unknown>).items as Record<string, unknown>[]).map(normalizeGroupBuyingItem)
      : []
    const members = Array.isArray((data as Record<string, unknown>).members)
      ? ((data as Record<string, unknown>).members as Record<string, unknown>[]).map(normalizeGroupBuyingMember)
      : []

    return {
      group: normalizeGroupBuyingGroup(groupData),
      items,
      members,
    }
  }

  if (path.includes('group-buying')) return normalizeGroupBuyingGroup(data as Record<string, unknown>)
  if (path.includes('subscriptions/plans')) return normalizeSubscriptionPlan(data as Record<string, unknown>)
  if (path.includes('subscriptions/discounts')) return normalizeDiscountCode(data as Record<string, unknown>)
  if (path.includes('notifications')) return normalizeNotification(data as Record<string, unknown>)
  if (path.includes('custom-builder/designs') && !path.includes('versions')) return normalizeJewelryDesign(data as Record<string, unknown>)
  if (path.includes('custom-builder/designs') && path.includes('versions')) return normalizeJewelryDesignVersion(data as Record<string, unknown>)
  if (path.includes('custom-builder/gemstones')) return normalizeGemstone(data as Record<string, unknown>)
  if (path.includes('custom-builder/quotes')) return normalizeCustomBuilderQuote(data as Record<string, unknown>)
  if (path.includes('ai-engine/predictions')) return normalizeAiPricePrediction(data as Record<string, unknown>)
  if (path.includes('ai-engine/recommendations')) return normalizeAiDesignRecommendation(data as Record<string, unknown>)
  if (path.includes('ai-engine/matches')) return normalizeAiMarketMatch(data as Record<string, unknown>)
  if (path.includes('ai-engine/metrics')) return normalizeAiServiceMetric(data as Record<string, unknown>)
  if (path.includes('escrow/payments')) return normalizeEscrowPayment(data as Record<string, unknown>)
  if (path.includes('escrow/ratings')) return normalizeMarketplaceRating(data as Record<string, unknown>)
  if (path.includes('payments/transactions')) return normalizePaymentTransaction(data as Record<string, unknown>)
  if (path.includes('tracking')) return normalizeOrderTrackingEvent(data as Record<string, unknown>)
  if (path.includes('catalog/categories')) return normalizeProductCategory(data as Record<string, unknown>)
  if (path.includes('catalog/occasions')) return normalizeOccasionCategory(data as Record<string, unknown>)
  if (path.includes('catalog/products') && path.includes('media')) return normalizeProductMedia(data as Record<string, unknown>)
  if (path.includes('catalog/stones')) return normalizeStone(data as Record<string, unknown>)
  if (path.includes('catalog/products') && path.includes('stones')) return normalizeProductStone(data as Record<string, unknown>)
  if (path.includes('catalog/inventory')) return normalizeInventory(data as Record<string, unknown>)
  if (path.includes('catalog/sellers')) return normalizeSellerProfile(data as Record<string, unknown>)
  if (path.includes('cart/user') && !path.includes('transactions')) return normalizeCart(data as Record<string, unknown>)
  if (path.includes('cart/items')) return normalizeCartItem(data as Record<string, unknown>)
  if (path.includes('wallet/user') && path.includes('transactions')) return normalizeWalletTransaction(data as Record<string, unknown>)
  if (path.includes('wallet/user')) return normalizeWallet(data as Record<string, unknown>)
  if (path.includes('pricing/rules')) return normalizePricingRule(data as Record<string, unknown>)
  if (path.includes('pricing/spreads')) return normalizePricingSpread(data as Record<string, unknown>)
  if (path.includes('pricing/tax')) return normalizeTaxRule(data as Record<string, unknown>)
  if (path.includes('pricing/labor')) return normalizeLaborCostRule(data as Record<string, unknown>)
  if (path.includes('liquidity/requests')) return normalizeLiquidityRequest(data as Record<string, unknown>)
  if (path.includes('liquidity/recommendations')) return normalizeSellRecommendation(data as Record<string, unknown>)
  if (path.includes('liquidity/buyer-requests')) return normalizeBuyerRequest(data as Record<string, unknown>)
  if (path.includes('ar/models')) return normalizeArModel(data as Record<string, unknown>)
  if (path.includes('ar/previews')) return normalizeArPreview(data as Record<string, unknown>)
  if (path.includes('content/pages')) return normalizeContentPage(data as Record<string, unknown>)
  if (path.includes('content/promotions')) return normalizePromotion(data as Record<string, unknown>)
  if (path.includes('content/ads')) return normalizeAdCampaign(data as Record<string, unknown>)
  if (path.includes('audit/logs')) return normalizeAuditLog(data as Record<string, unknown>)
  if (path.includes('audit/events')) return normalizeEventLog(data as Record<string, unknown>)
  if (path.includes('audit/settings')) return normalizeSystemSetting(data as Record<string, unknown>)
  if (path.includes('audit/notification-preferences')) return normalizeNotificationPreference(data as Record<string, unknown>)
  if (path.includes('users/otp-sessions')) return normalizeOtpSession(data as Record<string, unknown>)
  if (path.includes('users/kyc') && !path.includes('public')) return normalizeKycProfile(data as Record<string, unknown>)
  if (path.includes('users/profile') && !path.includes('public')) return normalizeUserProfile(data as Record<string, unknown>)
  if (path.includes('users/addresses')) return normalizeUserAddress(data as Record<string, unknown>)
  if (path.includes('users/bank-accounts')) return normalizeUserBankAccount(data as Record<string, unknown>)
  if (path.includes('users/public-profile')) return normalizePublicProfile(data as Record<string, unknown>)
  if (path.includes('community-extensions/follows')) return normalizeUserFollow(data as Record<string, unknown>)
  if (path.includes('community-extensions/saves')) return normalizeDesignSave(data as Record<string, unknown>)
  if (path.includes('community-extensions/badges')) return normalizeUserBadge(data as Record<string, unknown>)
  if (path.includes('community-extensions/challenge-rewards')) return normalizeChallengeReward(data as Record<string, unknown>)
  if (path.includes('/status-history')) return normalizeOrderStatusHistory(data as Record<string, unknown>)
  if (path.includes('/shipments')) return normalizeShipment(data as Record<string, unknown>)
  if (path.includes('/invoices')) return normalizeInvoice(data as Record<string, unknown>)
  if (path.includes('/refunds')) return normalizeRefund(data as Record<string, unknown>)
  if (path.includes('/cancellations')) return normalizeOrderCancellation(data as Record<string, unknown>)
  if (path.includes('orders')) return normalizeOrder(data as Record<string, unknown>)
  if (path.includes('users')) return normalizeUser(data as Record<string, unknown>)
  if (path.includes('auth/login') || path.includes('auth/refresh')) return normalizeAuthPayload(data as Record<string, unknown>)
  if (path.includes('admin/stats')) return normalizeAdminStats(data as Record<string, unknown>)

  return data
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value !== '') return Number(value)
  return 0
}

function normalizeJewelryDesign(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    userName: String(value.userName || value.user_name || ''),
    weight: toNumber(value.weight),
    karat: toNumber(value.karat),
    metalColor: value.metalColor ?? value.metal_color ?? null,
    stones: Array.isArray(value.stones) ? value.stones : [],
    dimensions: value.dimensions ?? null,
    imageUrl: value.imageUrl ?? value.image_url ?? null,
    modelUrl: value.modelUrl ?? value.model_url ?? null,
    preview3dUrl: value.preview3dUrl ?? value.preview_3d_url ?? null,
    estimatedGoldPrice: toNumber(value.estimatedGoldPrice || value.estimated_gold_price),
    laborCost: toNumber(value.laborCost || value.labor_cost),
    profit: toNumber(value.profit),
    tax: toNumber(value.tax),
    totalPrice: toNumber(value.totalPrice || value.total_price),
    baseType: value.baseType || value.base_type || 'simple',
    status: value.status || 'draft',
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeJewelryDesignVersion(value: Record<string, unknown>) {
  return {
    ...value,
    designId: String(value.designId || value.design_id || ''),
    version: toNumber(value.version),
    totalPrice: toNumber(value.totalPrice || value.total_price),
    modelUrl: value.modelUrl ?? value.model_url ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeGemstone(value: Record<string, unknown>) {
  return {
    ...value,
    pricePerCarat: toNumber(value.pricePerCarat || value.price_per_carat),
    stock: toNumber(value.stock),
    imageUrl: value.imageUrl ?? value.image_url ?? null,
    color: value.color ?? null,
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeCustomBuilderQuote(value: Record<string, unknown>) {
  return {
    ...value,
    designId: value.designId ?? value.design_id ?? null,
    userId: String(value.userId || value.user_id || ''),
    goldPriceSnapshot: toNumber(value.goldPriceSnapshot || value.gold_price_snapshot),
    goldWeight: toNumber(value.goldWeight || value.gold_weight),
    laborCost: toNumber(value.laborCost || value.labor_cost),
    profit: toNumber(value.profit),
    tax: toNumber(value.tax),
    total: toNumber(value.total),
    expiresAt: value.expiresAt ?? value.expires_at ?? null,
    status: value.status || 'draft',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAiPricePrediction(value: Record<string, unknown>) {
  return {
    ...value,
    targetId: value.targetId ?? value.target_id ?? null,
    targetType: value.targetType || value.target_type || '',
    currentPrice: toNumber(value.currentPrice || value.current_price),
    predictedPrice: toNumber(value.predictedPrice || value.predicted_price),
    confidenceScore: toNumber(value.confidenceScore || value.confidence_score),
    horizonDays: toNumber(value.horizonDays || value.horizon_days),
    modelVersion: value.modelVersion || value.model_version || '',
    features: value.features ?? {},
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAiDesignRecommendation(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    designId: value.designId ?? value.design_id ?? null,
    productIds: Array.isArray(value.productIds) ? value.productIds : value.product_ids ?? [],
    score: toNumber(value.score),
    reason: value.reason || '',
    source: value.source || '',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAiMarketMatch(value: Record<string, unknown>) {
  return {
    ...value,
    buyerId: String(value.buyerId || value.buyer_id || ''),
    sellerId: String(value.sellerId || value.seller_id || ''),
    listingId: value.listingId ?? value.listing_id ?? null,
    score: toNumber(value.score),
    reason: value.reason || '',
    status: value.status || 'pending',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAiServiceMetric(value: Record<string, unknown>) {
  return {
    ...value,
    value: toNumber(value.value),
    metadata: value.metadata ?? {},
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeEscrowPayment(value: Record<string, unknown>) {
  return {
    ...value,
    listingId: value.listingId ?? value.listing_id ?? null,
    auctionId: value.auctionId ?? value.auction_id ?? null,
    orderId: value.orderId ?? value.order_id ?? null,
    buyerId: String(value.buyerId || value.buyer_id || ''),
    sellerId: String(value.sellerId || value.seller_id || ''),
    amount: toNumber(value.amount),
    fee: toNumber(value.fee),
    authority: value.authority ?? null,
    paymentUrl: value.paymentUrl ?? value.payment_url ?? null,
    trackingCode: value.trackingCode ?? value.tracking_code ?? null,
    status: value.status || 'held',
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeMarketplaceRating(value: Record<string, unknown>) {
  return {
    ...value,
    reviewerId: String(value.reviewerId || value.reviewer_id || ''),
    revieweeId: String(value.revieweeId || value.reviewee_id || ''),
    listingId: value.listingId ?? value.listing_id ?? null,
    orderId: value.orderId ?? value.order_id ?? null,
    rating: toNumber(value.rating),
    body: value.body ?? null,
    category: value.category || '',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizePaymentTransaction(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: value.orderId ?? value.order_id ?? null,
    auctionId: value.auctionId ?? value.auction_id ?? null,
    escrowId: value.escrowId ?? value.escrow_id ?? null,
    userId: String(value.userId || value.user_id || ''),
    amount: toNumber(value.amount),
    paymentMethod: value.paymentMethod || value.payment_method || '',
    authority: value.authority ?? null,
    referenceId: value.referenceId ?? value.reference_id ?? null,
    trackingCode: value.trackingCode ?? value.tracking_code ?? null,
    paidAt: value.paidAt ?? value.paid_at ?? null,
    status: value.status || 'pending',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeOrderTrackingEvent(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    status: value.status || '',
    location: value.location ?? null,
    description: value.description ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeProductCategory(value: Record<string, unknown>) {
  return {
    ...value,
    iconUrl: value.iconUrl ?? value.icon_url ?? null,
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeOccasionCategory(value: Record<string, unknown>) {
  return {
    ...value,
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeProductMedia(value: Record<string, unknown>) {
  return {
    ...value,
    productId: String(value.productId || value.product_id || ''),
    sortOrder: toNumber(value.sortOrder ?? value.sort_order),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeStone(value: Record<string, unknown>) {
  return {
    ...value,
    pricePerCarat: toNumber(value.pricePerCarat || value.price_per_carat),
    color: value.color ?? null,
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeProductStone(value: Record<string, unknown>) {
  return {
    ...value,
    productId: String(value.productId || value.product_id || ''),
    stoneId: String(value.stoneId || value.stone_id || ''),
    carat: toNumber(value.carat),
    position: value.position ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeInventory(value: Record<string, unknown>) {
  return {
    ...value,
    productId: String(value.productId || value.product_id || ''),
    stock: toNumber(value.stock),
    reservedStock: toNumber(value.reservedStock || value.reserved_stock),
    warehouse: value.warehouse ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeSellerProfile(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    storeName: value.storeName || value.store_name || '',
    description: value.description ?? null,
    location: value.location ?? null,
    rating: toNumber(value.rating),
    isVerified: Boolean(value.isVerified ?? value.is_verified),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeCart(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeCartItem(value: Record<string, unknown>) {
  return {
    ...value,
    cartId: String(value.cartId || value.cart_id || ''),
    productId: String(value.productId || value.product_id || ''),
    quantity: toNumber(value.quantity),
    unitPrice: toNumber(value.unitPrice || value.unit_price),
    totalPrice: toNumber(value.totalPrice || value.total_price),
    reservedUntil: value.reservedUntil ?? value.reserved_until ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeWallet(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    balance: toNumber(value.balance),
    goldBalanceGrams: toNumber(value.goldBalanceGrams || value.gold_balance_grams || value.goldBalanceGrams),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeWalletTransaction(value: Record<string, unknown>) {
  return {
    ...value,
    walletId: String(value.walletId || value.wallet_id || ''),
    userId: String(value.userId || value.user_id || ''),
    orderId: value.orderId ?? value.order_id ?? null,
    escrowId: value.escrowId ?? value.escrow_id ?? null,
    amount: toNumber(value.amount),
    description: value.description ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizePricingRule(value: Record<string, unknown>) {
  return {
    ...value,
    description: value.description ?? null,
    laborRate: toNumber(value.laborRate || value.labor_rate),
    profitRate: toNumber(value.profitRate || value.profit_rate),
    taxRate: toNumber(value.taxRate || value.tax_rate),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizePricingSpread(value: Record<string, unknown>) {
  return {
    ...value,
    productCategory: value.productCategory || value.product_category || '',
    spreadPercent: toNumber(value.spreadPercent || value.spread_percent),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeTaxRule(value: Record<string, unknown>) {
  return {
    ...value,
    productCategory: value.productCategory ?? value.product_category ?? null,
    taxRate: toNumber(value.taxRate || value.tax_rate),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeLaborCostRule(value: Record<string, unknown>) {
  return {
    ...value,
    productCategory: value.productCategory || value.product_category || '',
    baseLabor: toNumber(value.baseLabor || value.base_labor),
    perGramLabor: toNumber(value.perGramLabor || value.per_gram_labor),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeLiquidityRequest(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    assetId: value.assetId ?? value.asset_id ?? null,
    listingId: value.listingId ?? value.listing_id ?? null,
    expectedPrice: toNumber(value.expectedPrice || value.expected_price),
    notes: value.notes ?? null,
    status: value.status || 'draft',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeSellRecommendation(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    assetId: value.assetId ?? value.asset_id ?? null,
    recommendedPrice: toNumber(value.recommendedPrice || value.recommended_price),
    liquidityScore: toNumber(value.liquidityScore || value.liquidity_score),
    reason: value.reason || '',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeBuyerRequest(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    category: value.category ?? null,
    minWeight: toNumber(value.minWeight || value.min_weight),
    maxWeight: toNumber(value.maxWeight || value.max_weight),
    budget: toNumber(value.budget),
    status: value.status || 'open',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeArModel(value: Record<string, unknown>) {
  return {
    ...value,
    productId: value.productId ?? value.product_id ?? null,
    designId: value.designId ?? value.design_id ?? null,
    modelUrl: value.modelUrl || value.model_url || '',
    thumbnailUrl: value.thumbnailUrl ?? value.thumbnail_url ?? null,
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeArPreview(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    modelId: String(value.modelId || value.model_id || ''),
    screenshotUrl: value.screenshotUrl ?? value.screenshot_url ?? null,
    videoUrl: value.videoUrl ?? value.video_url ?? null,
    isShared: Boolean(value.isShared ?? value.is_shared),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeContentPage(value: Record<string, unknown>) {
  return {
    ...value,
    coverUrl: value.coverUrl ?? value.cover_url ?? null,
    isPublished: Boolean(value.isPublished ?? value.is_published),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizePromotion(value: Record<string, unknown>) {
  return {
    ...value,
    description: value.description ?? null,
    discountValue: toNumber(value.discountValue || value.discount_value),
    discountType: value.discountType || value.discount_type || 'percent',
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAdCampaign(value: Record<string, unknown>) {
  return {
    ...value,
    brandName: value.brandName || value.brand_name || '',
    description: value.description ?? null,
    budget: toNumber(value.budget),
    isActive: Boolean(value.isActive ?? value.is_active),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeAuditLog(value: Record<string, unknown>) {
  return {
    ...value,
    userId: value.userId ?? value.user_id ?? null,
    entityType: value.entityType ?? value.entity_type ?? null,
    entityId: value.entityId ?? value.entity_id ?? null,
    metadata: value.metadata ?? {},
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeEventLog(value: Record<string, unknown>) {
  return {
    ...value,
    aggregateType: value.aggregateType ?? value.aggregate_type ?? null,
    aggregateId: value.aggregateId ?? value.aggregate_id ?? null,
    payload: value.payload ?? {},
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeSystemSetting(value: Record<string, unknown>) {
  return {
    ...value,
    description: value.description ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeNotificationPreference(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    inApp: Boolean(value.inApp ?? value.in_app),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeOtpSession(value: Record<string, unknown>) {
  return {
    ...value,
    codeHash: value.codeHash || value.code_hash || '',
    isVerified: Boolean(value.isVerified ?? value.is_verified),
    expiresAt: String(value.expiresAt || value.expires_at || ''),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeKycProfile(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    fullName: value.fullName ?? value.full_name ?? null,
    nationalCodeHash: value.nationalCodeHash ?? value.national_code_hash ?? null,
    documentUrl: value.documentUrl ?? value.document_url ?? null,
    rejectionReason: value.rejectionReason ?? value.rejection_reason ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeUserProfile(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    avatarUrl: value.avatarUrl ?? value.avatar_url ?? null,
    bio: value.bio ?? null,
    birthDate: value.birthDate ?? value.birth_date ?? null,
    isPublic: Boolean(value.isPublic ?? value.is_public),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeUserAddress(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    postalCode: value.postalCode ?? value.postal_code ?? null,
    isDefault: Boolean(value.isDefault ?? value.is_default),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeUserBankAccount(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    bankName: value.bankName || value.bank_name || '',
    accountNumberHash: value.accountNumberHash || value.account_number_hash || '',
    accountHolder: value.accountHolder ?? value.account_holder ?? null,
    isDefault: Boolean(value.isDefault ?? value.is_default),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizePublicProfile(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    displayName: value.displayName || value.display_name || '',
    tagline: value.tagline ?? null,
    avatarUrl: value.avatarUrl ?? value.avatar_url ?? null,
    rating: toNumber(value.rating),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeUserFollow(value: Record<string, unknown>) {
  return {
    ...value,
    followerId: String(value.followerId || value.follower_id || ''),
    followingId: String(value.followingId || value.following_id || ''),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeDesignSave(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    postId: value.postId ?? value.post_id ?? null,
    designId: value.designId ?? value.design_id ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeUserBadge(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    description: value.description ?? null,
    iconUrl: value.iconUrl ?? value.icon_url ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeChallengeReward(value: Record<string, unknown>) {
  return {
    ...value,
    challengeId: String(value.challengeId || value.challenge_id || ''),
    postId: value.postId ?? value.post_id ?? null,
    userId: String(value.userId || value.user_id || ''),
    rewardType: value.rewardType || value.reward_type || '',
    rewardValue: toNumber(value.rewardValue || value.reward_value),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeOrder(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    items: Array.isArray(value.items)
      ? (value.items as Record<string, unknown>[]).map((item) => ({
          ...item,
          quantity: toNumber(item.quantity),
          unitPrice: toNumber(item.unitPrice ?? item.unit_price),
          totalPrice: toNumber(item.totalPrice ?? item.total_price),
        }))
      : [],
    totalAmount: toNumber(value.totalAmount ?? value.total_amount ?? value.total_rial_amount),
    shippingCost: toNumber(value.shippingCost ?? value.shipping_cost),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeOrderStatusHistory(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    note: value.note ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeShipment(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    carrier: value.carrier ?? null,
    trackingCode: value.trackingCode ?? value.tracking_code ?? null,
    status: value.status || 'registered',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeInvoice(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    invoiceNumber: value.invoiceNumber || value.invoice_number || '',
    totalAmount: toNumber(value.totalAmount || value.total_amount),
    pdfUrl: value.pdfUrl ?? value.pdf_url ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeRefund(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    amount: toNumber(value.amount),
    reason: value.reason || '',
    status: value.status || 'pending',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeOrderCancellation(value: Record<string, unknown>) {
  return {
    ...value,
    orderId: String(value.orderId || value.order_id || ''),
    reason: value.reason || '',
    status: value.status || 'pending',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeGoldPrice(value: Record<string, unknown>) {
  return {
    ...value,
    value: toNumber(value.value),
    change: toNumber(value.change),
    changePercent: toNumber(value.changePercent),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeProductsHomeFeed(value: Record<string, unknown>): ProductsHomeFeed {
  const normalizeCollection = (items: unknown): Product[] =>
    Array.isArray(items)
      ? items.filter(isRecord).map(normalizeProduct)
      : []

  return {
    newProducts: normalizeCollection(value.newProducts ?? value.new_products),
    featured: normalizeCollection(value.featured),
    discounted: normalizeCollection(value.discounted),
  }
}

export function normalizeProduct(value: Record<string, unknown>): Product {
  const discountValue = value.discount ?? value.discount_percent
  const normalizedDiscount = discountValue === null
    ? null
    : toOptionalNumber(discountValue)

  return {
    id: toStringValue(value.id ?? value.productId ?? value.product_id),
    name: toStringValue(value.name ?? value.title, 'محصول بدون نام'),
    category: toProductCategory(value.category ?? value.category_slug),
    description: toStringValue(value.description),
    weight: toNumber(value.weight),
    karat: toNumber(value.karat) === 24 ? 24 : 18,
    labor: toNumber(value.labor),
    profit: toNumber(value.profit),
    tax: toNumber(value.tax),
    basePrice: toNumber(value.basePrice ?? value.base_price),
    finalPrice: toNumber(value.finalPrice ?? value.final_price),
    stock: toNumber(value.stock),
    images: normalizeImages(value.images),
    video: typeof value.video === 'string' ? value.video : undefined,
    sellerName: toStringValue(value.sellerName ?? value.seller_name) || undefined,
    sellerLocation: toStringValue(value.sellerLocation ?? value.seller_location) || undefined,
    stones: Array.isArray(value.stones) ? value.stones : undefined,
    dimensions: value.dimensions,
    metalColor: toNullableString(value.metalColor ?? value.metal_color),
    lockType: toNullableString(value.lockType ?? value.lock_type),
    seller: normalizeSeller(value.seller),
    isNew: toBoolean(value.isNew ?? value.is_new),
    isFeatured: toBoolean(value.isFeatured ?? value.is_featured),
    discount: normalizedDiscount,
    createdAt: toStringValue(value.createdAt ?? value.created_at),
  }
}

function normalizeAuction(value: Record<string, unknown>) {
  const product = value.product && typeof value.product === 'object'
    ? normalizeProduct(value.product as Record<string, unknown>)
    : {
      id: String(value.productId ?? value.product_id ?? ''),
      name: 'محصول مزایده',
      category: 'custom',
      description: '',
      weight: 0,
      karat: 18,
      labor: 0,
      profit: 0,
      tax: 9,
      basePrice: 0,
      finalPrice: toNumber(value.currentPrice || value.current_price),
      stock: 1,
      images: [],
      createdAt: '',
    }

  return {
    ...value,
    productId: value.productId ?? value.product_id ?? null,
    sellerId: String(value.sellerId || value.seller_id || ''),
    sellerName: String(value.sellerName || value.seller_name || ''),
    qualityBadge: Boolean(value.qualityBadge ?? value.quality_badge),
    expertName: value.expertName ?? value.expert_name ?? null,
    expertNotes: value.expertNotes ?? value.expert_notes ?? null,
    startingPrice: toNumber(value.startingPrice || value.starting_price),
    reservePrice: value.reservePrice === undefined || value.reservePrice === null
      ? null
      : toNumber(value.reservePrice || value.reserve_price),
    currentPrice: toNumber(value.currentPrice || value.current_price),
    bidIncrementType: value.bidIncrementType || value.bid_increment_type || 'amount',
    minimumBidIncrement: toNumber(value.minimumBidIncrement || value.minimum_bid_increment),
    bidIncrementPercent: toNumber(value.bidIncrementPercent || value.bid_increment_percent),
    bidCount: toNumber(value.bidCount || value.bid_count),
    durationDays: toNumber(value.durationDays || value.duration_days),
    autoExtendMinutes: toNumber(value.autoExtendMinutes || value.auto_extend_minutes),
    autoExtendSeconds: toNumber(value.autoExtendSeconds || value.auto_extend_seconds),
    paymentWindowMinutes: toNumber(value.paymentWindowMinutes || value.payment_window_minutes),
    paymentDeadlineAt: value.paymentDeadlineAt ?? value.payment_deadline_at ?? null,
    commissionRate: toNumber(value.commissionRate || value.commission_rate),
    commissionAmount: toNumber(value.commissionAmount || value.commission_amount),
    shippingMethod: value.shippingMethod || value.shipping_method || 'courier',
    shippingCost: toNumber(value.shippingCost || value.shipping_cost),
    reserveMet: Boolean(value.reserveMet ?? value.reserve_met),
    winningBidderId: value.winningBidderId ?? value.winning_bidder_id ?? null,
    winningBidderName: value.winningBidderName ?? value.winning_bidder_name ?? null,
    winningAmount: value.winningAmount === undefined || value.winningAmount === null
      ? null
      : toNumber(value.winningAmount || value.winning_amount),
    secondWinnerId: value.secondWinnerId ?? value.second_winner_id ?? null,
    secondWinnerName: value.secondWinnerName ?? value.second_winner_name ?? null,
    secondWinnerAmount: value.secondWinnerAmount === undefined || value.secondWinnerAmount === null
      ? null
      : toNumber(value.secondWinnerAmount || value.second_winner_amount),
    paymentStatus: value.paymentStatus || value.payment_status || 'unpaid',
    status: value.status || 'pending_review',
    qualityStatus: value.qualityStatus || value.quality_status || 'not_sent',
    startsAt: String(value.startsAt || value.starts_at || ''),
    endsAt: String(value.endsAt || value.ends_at || ''),
    isFeatured: Boolean(value.isFeatured ?? value.is_featured),
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
    product,
  }
}

function normalizeAuctionBid(value: Record<string, unknown>) {
  return {
    ...value,
    auctionId: String(value.auctionId || value.auction_id || ''),
    bidderId: String(value.bidderId || value.bidder_id || ''),
    bidderName: String(value.bidderName || value.bidder_name || ''),
    amount: toNumber(value.amount),
    isWinning: Boolean(value.isWinning ?? value.is_winning),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeUsedGoldListing(value: Record<string, unknown>) {
  return {
    ...value,
    productId: value.productId ?? value.product_id ?? null,
    orderId: value.orderId ?? value.order_id ?? null,
    sellerId: String(value.sellerId || value.seller_id || ''),
    sellerName: String(value.sellerName || value.seller_name || ''),
    weight: toNumber(value.weight),
    karat: toNumber(value.karat),
    images: Array.isArray(value.images) ? value.images : [],
    fixedPrice: value.fixedPrice === undefined || value.fixedPrice === null
      ? null
      : toNumber(value.fixedPrice || value.fixed_price),
    startingPrice: value.startingPrice === undefined || value.startingPrice === null
      ? null
      : toNumber(value.startingPrice || value.starting_price),
    reservePrice: value.reservePrice === undefined || value.reservePrice === null
      ? null
      : toNumber(value.reservePrice || value.reserve_price),
    minimumBidIncrement: value.minimumBidIncrement === undefined || value.minimumBidIncrement === null
      ? null
      : toNumber(value.minimumBidIncrement || value.minimum_bid_increment),
    auctionDurationDays: value.auctionDurationDays === undefined || value.auctionDurationDays === null
      ? null
      : toNumber(value.auctionDurationDays || value.auction_duration_days),
    autoExtendEnabled: Boolean(value.autoExtendEnabled ?? value.auto_extend_enabled),
    autoExtendMinutes: toNumber(value.autoExtendMinutes || value.auto_extend_minutes),
    autoExtendSeconds: toNumber(value.autoExtendSeconds || value.auto_extend_seconds),
    paymentWindowMinutes: toNumber(value.paymentWindowMinutes || value.payment_window_minutes),
    commissionRate: toNumber(value.commissionRate || value.commission_rate),
    qualityBadge: Boolean(value.qualityBadge ?? value.quality_badge),
    expertName: value.expertName ?? value.expert_name ?? null,
    expertNotes: value.expertNotes ?? value.expert_notes ?? null,
    viewCount: toNumber(value.viewCount || value.view_count),
    favoriteCount: toNumber(value.favoriteCount || value.favorite_count),
    saleType: value.saleType || value.sale_type || 'direct',
    source: value.source || 'manual',
    status: value.status || 'pending_review',
    qualityStatus: value.qualityStatus || value.quality_status || 'not_sent',
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeSmartVaultAsset(value: Record<string, unknown>) {
  return {
    ...value,
    productId: value.productId ?? value.product_id ?? null,
    orderId: value.orderId ?? value.order_id ?? null,
    userId: String(value.userId || value.user_id || ''),
    weight: toNumber(value.weight),
    karat: toNumber(value.karat),
    purchasePrice: toNumber(value.purchasePrice || value.purchase_price),
    purchaseDate: String(value.purchaseDate || value.purchase_date || ''),
    currentRawGoldValue: toNumber(value.currentRawGoldValue || value.current_raw_gold_value),
    currentValue: toNumber(value.currentValue || value.current_value),
    profitLoss: toNumber(value.profitLoss || value.profit_loss),
    profitLossPercent: toNumber(value.profitLossPercent || value.profit_loss_percent),
    images: Array.isArray(value.images) ? value.images : [],
    category: value.category ?? null,
    metadata: value.metadata ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeAssetSnapshot(value: Record<string, unknown>) {
  return {
    ...value,
    assetId: String(value.assetId || value.asset_id || ''),
    userId: String(value.userId || value.user_id || ''),
    rawGoldValue: toNumber(value.rawGoldValue || value.raw_gold_value),
    totalValue: toNumber(value.totalValue || value.total_value),
    profitLoss: toNumber(value.profitLoss || value.profit_loss),
    goldPrice: toNumber(value.goldPrice || value.gold_price),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizePriceAlert(value: Record<string, unknown>) {
  return {
    ...value,
    userId: String(value.userId || value.user_id || ''),
    targetId: value.targetId ?? value.target_id ?? null,
    targetPrice: toNumber(value.targetPrice || value.target_price),
    triggerCondition: value.triggerCondition || value.trigger_condition || 'greater_than_or_equal',
    isActive: Boolean(value.isActive ?? value.is_active),
    notifiedAt: value.notifiedAt ?? value.notified_at ?? null,
    targetType: value.targetType || value.target_type || 'gold_price',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeGroupBuyingGroup(value: Record<string, unknown>) {
  return {
    ...value,
    leaderId: String(value.leaderId || value.leader_id || ''),
    leaderName: String(value.leaderName || value.leader_name || ''),
    paymentMode: value.paymentMode || value.payment_mode || 'member',
    targetAmount: toNumber(value.targetAmount || value.target_amount),
    discountRate: toNumber(value.discountRate || value.discount_rate),
    inviteCode: String(value.inviteCode || value.invite_code || ''),
    status: value.status || 'draft',
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeGroupBuyingItem(value: Record<string, unknown>) {
  return {
    ...value,
    groupId: String(value.groupId || value.group_id || ''),
    productId: String(value.productId || value.product_id || ''),
    quantity: toNumber(value.quantity),
    unitPrice: toNumber(value.unitPrice || value.unit_price),
    totalPrice: toNumber(value.totalPrice || value.total_price),
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeGroupBuyingMember(value: Record<string, unknown>) {
  return {
    ...value,
    groupId: String(value.groupId || value.group_id || ''),
    userId: String(value.userId || value.user_id || ''),
    userName: String(value.userName || value.user_name || ''),
    shareAmount: toNumber(value.shareAmount || value.share_amount),
    paidAmount: toNumber(value.paidAmount || value.paid_amount),
    status: value.status || 'invited',
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeSubscriptionPlan(value: Record<string, unknown>) {
  return {
    ...value,
    price: toNumber(value.price),
    durationDays: toNumber(value.durationDays || value.duration_days),
    features: Array.isArray(value.features) ? value.features : null,
    isActive: Boolean(value.isActive ?? value.is_active),
    level: value.level || 'silver',
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeDiscountCode(value: Record<string, unknown>) {
  return {
    ...value,
    discountValue: toNumber(value.discountValue || value.discount_value),
    minPurchase: toNumber(value.minPurchase || value.min_purchase),
    expiresAt: value.expiresAt ?? value.expires_at ?? null,
    discountType: value.discountType || value.discount_type || 'percent',
    isActive: Boolean(value.isActive ?? value.is_active),
    description: value.description ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
    updatedAt: String(value.updatedAt || value.updated_at || ''),
  }
}

function normalizeNotification(value: Record<string, unknown>) {
  return {
    ...value,
    userId: value.userId ?? value.user_id ?? null,
    channel: value.channel || 'in_app',
    isRead: Boolean(value.isRead ?? value.is_read),
    metadata: value.metadata ?? null,
    readAt: value.readAt ?? value.read_at ?? null,
    createdAt: String(value.createdAt || value.created_at || ''),
  }
}

function normalizeUser(value: Record<string, unknown>) {
  return {
    ...value,
    addresses: Array.isArray(value.addresses) ? value.addresses : [],
    orders: Array.isArray(value.orders) ? value.orders : [],
  }
}

function normalizeAuthPayload(value: Record<string, unknown>) {
  return {
    ...value,
    user: normalizeUser(value.user && typeof value.user === 'object' ? (value.user as Record<string, unknown>) : {}),
    accessToken: String(value.accessToken || value.access_token || value.token || ''),
    refreshToken: String(value.refreshToken || value.refresh_token || ''),
    token: String(value.token || value.accessToken || value.access_token || ''),
  }
}

function normalizeAdminStats(value: Record<string, unknown>) {
  return {
    ...value,
    totalUsers: toNumber(value.totalUsers),
    totalOrders: toNumber(value.totalOrders),
    totalProducts: toNumber(value.totalProducts),
    totalAuctions: toNumber(value.totalAuctions),
    activeAuctions: toNumber(value.activeAuctions),
    totalListings: toNumber(value.totalListings),
    pendingReviews: toNumber(value.pendingReviews),
    totalVaultAssets: toNumber(value.totalVaultAssets),
    totalAlerts: toNumber(value.totalAlerts),
    totalSubscriptionPlans: toNumber(value.totalSubscriptionPlans),
    totalCustomDesigns: toNumber(value.totalCustomDesigns),
    totalAiPredictions: toNumber(value.totalAiPredictions),
    totalEscrowPayments: toNumber(value.totalEscrowPayments),
    totalPaymentTransactions: toNumber(value.totalPaymentTransactions),
    totalCategories: toNumber(value.totalCategories),
    totalCartItems: toNumber(value.totalCartItems),
    totalWallets: toNumber(value.totalWallets),
    totalPricingRules: toNumber(value.totalPricingRules),
    totalLiquidityRequests: toNumber(value.totalLiquidityRequests),
    totalArModels: toNumber(value.totalArModels),
    totalContentPages: toNumber(value.totalContentPages),
    totalAuditLogs: toNumber(value.totalAuditLogs),
    totalFollows: toNumber(value.totalFollows),
    todayOrders: toNumber(value.todayOrders),
    totalRevenue: toNumber(value.totalRevenue),
    todayRevenue: toNumber(value.todayRevenue),
    auctionRevenue: toNumber(value.auctionRevenue),
    escrowRevenue: toNumber(value.escrowRevenue),
    latestGoldPrice: value.latestGoldPrice && typeof value.latestGoldPrice === 'object'
      ? normalizeGoldPrice(value.latestGoldPrice as Record<string, unknown>)
      : null,
  }
}

export const api = {
  requestOtp: (phone: string, role: UserRole) => requestOtp(phone, role),
  loginWithOtp: (phone: string, otp: string, role: UserRole) => loginWithOtp(phone, otp, role),
  refreshToken: (refreshTokenValue: string) => refreshToken(refreshTokenValue),
  registerUser: (body: { name: string; phone: string; email?: string; role?: UserRole }) => registerUser(body),
  getGoldPrices: () => request<GoldPrice[]>('/gold-pricing'),
  getGoldPricingStatus: () => request<GoldPricingStatus>('/gold-pricing/status'),
  createPricingQuote: (category: string, goldWeight: number) =>
    request<{ quoteId: string; total: number; expiresAt: string }>('/pricing/quote/' + category, { method: 'POST', body: { goldWeight } }),
  getProductsPaginated: (params?: Record<string, string>) => fetchProductsPaginated(params),
  getProductsHome: () => request<ProductsHomeFeed>('/products/home'),
  getProductSuggestions: (category?: string, limit = 8) => {
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    params.set('limit', String(limit))
    return request<Product[]>(`/products/suggestions?${params.toString()}`)
  },
  getProducts: (params?: Record<string, string>) => {
    const query = params
      ? `?${new URLSearchParams(Object.entries(params).filter(([, value]) => Boolean(value))).toString()}`
      : ''
    return request<Product[]>(`/products${query}`)
  },
  getProduct: (id: string) => request<Product>(`/products/${id}`),
  getAuctions: () => request<Auction[]>('/auctions'),
  getActiveAuctions: () => request<Auction[]>('/auctions/active'),
  getAuction: (id: string) => request<Auction>(`/auctions/${id}`),
  getAuctionBids: (auctionId: string) => request<AuctionBid[]>(`/auctions/${auctionId}/bids`),
  getAuctionsByUser: (userId: string) => request<Auction[]>(`/auctions/user/${userId}`),
  createAuction: (body: CreateAuctionInput) => request<Auction>('/auctions', { method: 'POST', body }),
  placeAuctionBid: (auctionId: string, body: PlaceAuctionBidInput) =>
    request<Auction>(`/auctions/${auctionId}/bid`, { method: 'POST', body }),
  settleAuction: (auctionId: string, body: SettleAuctionInput) =>
    request<Auction>(`/auctions/${auctionId}/settle`, { method: 'POST', body }),
  cancelAuction: (auctionId: string) => request<Auction>(`/auctions/${auctionId}/cancel`, { method: 'PATCH' }),
  getUsedGoldListings: (status?: string) =>
    request<UsedGoldListing[]>(`/marketplace/listings${status ? `?status=${status}` : ''}`),
  getUsedGoldListing: (id: string) => request<UsedGoldListing>(`/marketplace/listings/${id}`),
  createUsedGoldListing: (body: CreateUsedGoldListingInput) =>
    request<UsedGoldListing>('/marketplace/listings', { method: 'POST', body }),
  getVaultAssets: (userId: string) => request<SmartVaultAsset[]>(`/smart-vault/assets/user/${userId}`),
  getVaultAlerts: (userId: string) => request<PriceAlert[]>(`/smart-vault/alerts/user/${userId}`),
  createPriceAlert: (body: CreatePriceAlertInput) =>
    request<PriceAlert>('/smart-vault/alerts', { method: 'POST', body }),
  getGroupBuyingGroups: () => request<GroupBuyingGroup[]>('/group-buying'),
  getGroupBuyingGroup: (id: string) => request<GroupBuyingGroup>(`/group-buying/${id}`),
  createGroupBuyingGroup: (body: CreateGroupBuyingGroupInput) =>
    request<GroupBuyingGroup>('/group-buying', { method: 'POST', body }),
  getSubscriptionPlans: () => request<SubscriptionPlan[]>('/subscriptions/plans'),
  getDiscountCodes: () => request<DiscountCode[]>('/subscriptions/discounts'),
  getNotifications: (userId: string) => request<Notification[]>(`/notifications/user/${userId}`),
  getJewelryDesigns: () => request<JewelryDesign[]>('/custom-builder/designs'),
  getJewelryDesignsByUser: (userId: string) => request<JewelryDesign[]>(`/custom-builder/designs/user/${userId}`),
  getJewelryDesignVersions: (designId: string) => request<JewelryDesignVersion[]>(`/custom-builder/designs/${designId}/versions`),
  createJewelryDesign: (body: CreateJewelryDesignInput) =>
    request<JewelryDesign>('/custom-builder/designs', { method: 'POST', body }),
  getGemstones: () => request<GemstoneLibrary[]>('/custom-builder/gemstones'),
  createGemstone: (body: CreateGemstoneInput) =>
    request<GemstoneLibrary>('/custom-builder/gemstones', { method: 'POST', body }),
  getCustomBuilderQuotes: (userId: string) => request<CustomBuilderQuote[]>(`/custom-builder/quotes/user/${userId}`),
  createCustomBuilderQuote: (body: CreateCustomBuilderQuoteInput) =>
    request<CustomBuilderQuote>('/custom-builder/quotes', { method: 'POST', body }),
  getAiPredictions: (userId: string) => request<AiPricePrediction[]>(`/ai-engine/predictions/user/${userId}`),
  getAiRecommendations: (userId: string) => request<AiDesignRecommendation[]>(`/ai-engine/recommendations/user/${userId}`),
  getAiMatches: () => request<AiMarketMatch[]>('/ai-engine/matches'),
  getAiMetrics: () => request<AiServiceMetric[]>('/ai-engine/metrics'),
  getAiProviders: () => request<AiProviderPublicConfig[]>('/ai-engine/providers'),
  runAiTask: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/text', { method: 'POST', body }),
  chatWithAi: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/chat', { method: 'POST', body }),
  askCodeAi: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/code', { method: 'POST', body }),
  analyzeArchitecture: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/architecture', { method: 'POST', body }),
  analyzeKycDocument: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/kyc-document', { method: 'POST', body }),
  safetyCheckAi: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/safety-check', { method: 'POST', body }),
  generateMarketingImage: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/marketing-image', { method: 'POST', body }),
  generateVectorAsset: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/vector-asset', { method: 'POST', body }),
  generateProductImage: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/product-image', { method: 'POST', body }),
  generateImageWorkflow: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/image-workflow', { method: 'POST', body }),
  generateAiContent: (body: RunAiTaskInput) => request<AiRunResult>('/ai-engine/generate-content', { method: 'POST', body }),
  rerunAiPredictions: (userId: string) => request<AiPricePrediction>('/ai-engine/predictions/rerun', { method: 'POST', body: { targetId: userId } }),
  rerunAiRecommendations: (userId: string) => request<AiDesignRecommendation>('/ai-engine/recommendations/rerun', { method: 'POST', body: { userId } }),
  rerunAiMatches: () => request<AiMarketMatch>('/ai-engine/matches/rerun', { method: 'POST', body: {} }),
  rerunAiMetrics: () => request<AiServiceMetric[]>('/ai-engine/metrics/rerun', { method: 'POST', body: {} }),
  rerunAiAll: (userId: string) => request<unknown>('/ai-engine/rerun', { method: 'POST', body: { userId } }),
  getEscrowPayments: () => request<EscrowPayment[]>('/escrow/payments'),
  createEscrowPayment: (body: CreateEscrowPaymentInput) =>
    request<EscrowPayment>('/escrow/payments', { method: 'POST', body }),
  getMarketplaceRatings: (userId: string) => request<MarketplaceRating[]>(`/escrow/ratings/user/${userId}`),
  createMarketplaceRating: (body: CreateMarketplaceRatingInput) =>
    request<MarketplaceRating>('/escrow/ratings', { method: 'POST', body }),
  getPaymentTransactions: () => request<PaymentTransaction[]>('/payments/transactions'),
  createPaymentTransaction: (body: CreatePaymentTransactionInput) =>
    request<PaymentTransaction>('/payments/transactions', { method: 'POST', body }),
  getOrderTracking: (orderId: string) => request<OrderTrackingEvent[]>(`/payments/orders/${orderId}/tracking`),
  createOrderTrackingEvent: (orderId: string, body: CreateOrderTrackingEventInput) =>
    request<OrderTrackingEvent>(`/payments/orders/${orderId}/tracking`, { method: 'POST', body }),
  getCategories: () => request<ProductCategoryMaster[]>('/catalog/categories'),
  getOccasions: () => request<OccasionCategory[]>('/catalog/occasions'),
  getProductMedia: (productId: string) => request<ProductMedia[]>(`/catalog/products/${productId}/media`),
  getStones: () => request<Stone[]>('/catalog/stones'),
  getProductStones: (productId: string) => request<ProductStone[]>(`/catalog/products/${productId}/stones`),
  getInventory: (productId: string) => request<Inventory>(`/catalog/inventory/${productId}`),
  getSellers: () => request<SellerProfile[]>('/catalog/sellers'),
  getCart: (userId: string) => request<Cart | null>(`/cart/user/${userId}`),
  createCart: (userId: string) => request<Cart>('/cart', { method: 'POST', body: { userId } }),
  addCartItem: (body: unknown) => request<CartItem>('/cart/items', { method: 'POST', body }),
  updateCartItemQuantity: (id: string, quantity: number) =>
    request<CartItem>(`/cart/items/${id}/quantity`, { method: 'PATCH', body: { quantity } }),
  removeCartItem: (id: string) => request<void>(`/cart/items/${id}`, { method: 'DELETE' }),
  clearCart: (cartId: string) => request<void>(`/cart/${cartId}/clear`, { method: 'POST', body: {} }),
  getWallet: (userId: string) => request<Wallet | null>(`/wallet/user/${userId}`),
  getWalletTransactions: (userId: string) => request<WalletTransaction[]>(`/wallet/user/${userId}/transactions`),
  getPricingRules: () => request<PricingRule[]>('/pricing/rules'),
  getPricingSpreads: () => request<PricingSpread[]>('/pricing/spreads'),
  getTaxRules: () => request<TaxRule[]>('/pricing/tax'),
  getLaborCostRules: () => request<LaborCostRule[]>('/pricing/labor'),
  calculatePrice: (category: string, goldWeight: number, rawGoldPrice: number) =>
    request<unknown>(`/pricing/calculate/${category}`, { method: 'POST', body: { goldWeight, rawGoldPrice } }),
  getLiquidityRequests: (userId: string) => request<LiquidityRequest[]>(`/liquidity/requests/user/${userId}`),
  createLiquidityRequest: (body: unknown) => request<LiquidityRequest>('/liquidity/requests', { method: 'POST', body }),
  getSellRecommendations: (userId: string) => request<SellRecommendation[]>(`/liquidity/recommendations/user/${userId}`),
  getBuyerRequests: () => request<BuyerRequest[]>('/liquidity/buyer-requests'),
  getArModels: () => request<ArModel[]>('/ar/models'),
  getArPreviews: (modelId: string) => request<ArPreview[]>(`/ar/models/${modelId}/previews`),
  getContentPages: () => request<ContentPage[]>('/content/pages'),
  getPromotions: () => request<Promotion[]>('/content/promotions'),
  getAdCampaigns: () => request<AdCampaign[]>('/content/ads'),
  getAuditLogs: () => request<AuditLog[]>('/audit/logs'),
  getEventLogs: () => request<EventLog[]>('/audit/events'),
  getSystemSettings: () => request<SystemSetting[]>('/audit/settings'),
  getNotificationPreferences: (userId: string) => request<NotificationPreference | null>(`/audit/notification-preferences/${userId}`),
  getUserFollows: (userId: string) => request<UserFollow[]>(`/community-extensions/follows/${userId}`),
  getUserSaves: (userId: string) => request<DesignSave[]>(`/community-extensions/saves/${userId}`),
  getUserBadges: (userId: string) => request<UserBadge[]>(`/community-extensions/badges/${userId}`),
  getChallengeRewards: (challengeId: string) => request<ChallengeReward[]>(`/community-extensions/challenge-rewards/${challengeId}`),
  getOrderStatusHistory: (orderId: string) => request<OrderStatusHistory[]>(`/orders/${orderId}/status-history`),
  getOrderShipments: (orderId: string) => request<Shipment[]>(`/orders/${orderId}/shipments`),
  getOrderInvoices: (orderId: string) => request<Invoice[]>(`/orders/${orderId}/invoices`),
  getOrderRefunds: (orderId: string) => request<Refund[]>(`/orders/${orderId}/refunds`),
  getOrderCancellations: (orderId: string) => request<OrderCancellation[]>(`/orders/${orderId}/cancellations`),
  getOtpSessions: (userId: string) => request<OtpSession[]>(`/users/${userId}/otp-sessions`),
  getKycProfile: (userId: string) => request<KycProfile | null>(`/users/${userId}/kyc`),
  getUserProfile: (userId: string) => request<UserProfile | null>(`/users/${userId}/profile`),
  getUserAddresses: (userId: string) => request<UserAddress[]>(`/users/${userId}/addresses`),
  getUserBankAccounts: (userId: string) => request<UserBankAccount[]>(`/users/${userId}/bank-accounts`),
  getPublicProfile: (userId: string) => request<PublicProfile | null>(`/users/${userId}/public-profile`),
  getUsers: () => request<User[]>('/users'),
  getUser: (id: string) => request<User>(`/users/${id}`),
  getOrders: () => request<Order[]>('/orders'),
  getOrdersByUser: (userId: string) => request<Order[]>(`/orders/user/${userId}`),
  createOrder: (body: CreateOrderInput) => request<Order>('/orders', { method: 'POST', body }),
  requestOnlinePayment: (body: RequestPaymentInput) =>
    request<{ paymentUrl: string | null; authority: string | null; mock?: boolean }>('/payments/zarinpal/request', { method: 'POST', body }),
  getAdminStats: () =>
    request<{
      totalUsers: number
      totalOrders: number
      totalProducts: number
      totalAuctions: number
      activeAuctions: number
      totalListings: number
      pendingReviews: number
      totalVaultAssets: number
      totalAlerts: number
      totalSubscriptionPlans: number
      totalCustomDesigns: number
      totalAiPredictions: number
      totalEscrowPayments: number
      totalPaymentTransactions: number
      totalCategories: number
      totalCartItems: number
      totalWallets: number
      totalPricingRules: number
      totalLiquidityRequests: number
      totalArModels: number
      totalContentPages: number
      totalAuditLogs: number
      totalFollows: number
      todayOrders: number
      totalRevenue: number
      todayRevenue: number
      auctionRevenue: number
      escrowRevenue: number
      latestGoldPrice: GoldPrice | null
    }>('/admin/stats'),
  getAdminUsers: (limit = 100) => request<User[]>(`/admin/users?limit=${limit}`),
  getAdminOrders: (limit = 100, status?: string) =>
    request<Order[]>(`/admin/orders?limit=${limit}${status ? `&status=${status}` : ''}`),
  updateAdminOrderStatus: (id: string, status: Order['status']) =>
    request<Order>(`/admin/orders/${id}/status`, { method: 'PATCH', body: { status } }),
  getAdminProducts: (limit = 100) => request<Product[]>(`/admin/products?limit=${limit}`),
  updateAdminProduct: (id: string, body: Partial<Product>) =>
    request<Product>(`/admin/products/${id}`, { method: 'PATCH', body }),
  getAdminPayments: (limit = 100, status?: string) =>
    request<PaymentTransaction[]>(`/admin/payments?limit=${limit}${status ? `&status=${status}` : ''}`),
  verifyAdminPayment: (id: string) => request<PaymentTransaction>(`/admin/payments/${id}/verify`, { method: 'PATCH' }),
  refundAdminPayment: (id: string, status: PaymentTransaction['status']) =>
    request<PaymentTransaction>(`/admin/payments/${id}/refund`, { method: 'PATCH', body: { status } }),
  getAdminSettings: () => request<SystemSetting[]>('/admin/settings'),
  updateAdminSetting: (key: string, value: Record<string, unknown>, description?: string) =>
    request<SystemSetting>('/admin/settings', { method: 'PATCH', body: { key, value, description } }),
  getAdminContent: () => request<ContentPage[]>('/admin/content'),
  updateAdminContent: (id: string, body: Partial<ContentPage>) =>
    request<ContentPage>(`/admin/content/${id}`, { method: 'PATCH', body }),
  getAdminAuditLogs: (limit = 100) => request<AuditLog[]>(`/admin/audit-logs?limit=${limit}`),
  getAdminRoles: () => request<Role[]>('/admin/roles'),
  getAdminPermissions: () => request<Permission[]>('/admin/permissions'),
  syncAdminRoles: () => request<{ roles: Role[]; permissions: Permission[] }>('/auth/roles/sync', { method: 'POST' }),
}

export interface CreateOrderInput {
  userId: string
  items: { productId: string; quantity: number }[]
  shippingCost: number
  address: {
    title: string
    province: string
    city: string
    street: string
    postalCode: string
    isDefault: boolean
  }
  paymentMethod: 'online' | 'wallet'
  quoteIds?: string[]
}

export interface RequestPaymentInput {
  userId: string
  orderId: string
  amount: number
  quoteId?: string
  idempotencyKey: string
  description?: string
}

export interface CreateAuctionInput {
  productId?: string | null
  sellerId: string
  sellerName: string
  startingPrice: number
  reservePrice?: number | null
  minimumBidIncrement: number
  bidIncrementType?: BidIncrementType
  bidIncrementPercent?: number
  durationDays?: number
  autoExtendMinutes?: number
  autoExtendSeconds?: number
  paymentWindowMinutes?: number
  commissionRate?: number
  shippingMethod?: 'post' | 'tipex' | 'courier'
  shippingCost?: number
  startsAt: string
  endsAt: string
  notes?: string | null
}

export interface PlaceAuctionBidInput {
  bidderId: string
  bidderName: string
  amount: number
}

export interface SettleAuctionInput {
  winnerId?: string | null
  winnerName?: string | null
  amount: number
  commissionRate?: number
  commissionAmount?: number
}

export interface CreateUsedGoldListingInput {
  sellerId: string
  sellerName: string
  productId?: string | null
  orderId?: string | null
  source?: UsedGoldSource
  title: string
  description: string
  weight: number
  karat: number
  images?: string[]
  saleType: UsedGoldListing['saleType']
  fixedPrice?: number | null
  startingPrice?: number | null
  reservePrice?: number | null
  minimumBidIncrement?: number | null
  auctionDurationDays?: number | null
  autoExtendEnabled?: boolean
  autoExtendMinutes?: number
  autoExtendSeconds?: number
  paymentWindowMinutes?: number
  commissionRate?: number
}

export interface CreatePriceAlertInput {
  userId: string
  targetType: PriceAlertTargetType
  targetId?: string | null
  targetPrice: number
  triggerCondition?: string
}

export interface CreateGroupBuyingGroupInput {
  leaderId: string
  leaderName: string
  title: string
  paymentMode?: GroupBuyingPaymentMode
  targetAmount?: number
  discountRate?: number
}

export interface CreateJewelryDesignInput {
  userId: string
  userName: string
  title: string
  category: JewelryDesign['category']
  baseType?: string
  weight: number
  karat?: number
  metalColor?: string | null
  stones?: unknown[]
  dimensions?: unknown
  imageUrl?: string | null
  modelUrl?: string | null
  preview3dUrl?: string | null
  estimatedGoldPrice?: number
  laborCost?: number
  profit?: number
  tax?: number
  totalPrice?: number
  status?: string
}

export interface CreateGemstoneInput {
  name: string
  type: string
  color?: string | null
  pricePerCarat: number
  stock?: number
  imageUrl?: string | null
  isActive?: boolean
}

export interface CreateCustomBuilderQuoteInput {
  designId?: string | null
  userId: string
  goldPriceSnapshot: number
  goldWeight: number
  laborCost: number
  profit?: number
  tax?: number
  total: number
  expiresAt?: string | null
  status?: string
}

export interface CreateEscrowPaymentInput {
  listingId?: string | null
  auctionId?: string | null
  orderId?: string | null
  buyerId: string
  sellerId: string
  amount: number
  fee?: number
  authority?: string | null
  paymentUrl?: string | null
  trackingCode?: string | null
}

export interface CreateMarketplaceRatingInput {
  reviewerId: string
  revieweeId: string
  listingId?: string | null
  orderId?: string | null
  rating: number
  body?: string | null
  category: string
}

export interface CreatePaymentTransactionInput {
  orderId?: string | null
  auctionId?: string | null
  escrowId?: string | null
  userId: string
  amount: number
  paymentMethod: string
  authority?: string | null
  referenceId?: string | null
  trackingCode?: string | null
}

export interface CreateOrderTrackingEventInput {
  orderId: string
  status: string
  location?: string | null
  description?: string | null
}
