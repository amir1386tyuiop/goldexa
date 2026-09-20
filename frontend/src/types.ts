export interface AuthTokenPayload {
  user: User
  accessToken: string
  refreshToken: string
  token?: string
  role?: string
  roleNames?: string[]
  permissions?: string[]
}

export interface OtpResponse {
  phone: string
  otp?: string
  expiresAt: string
  message: string
}

export type UserRole = 'buyer' | 'seller' | 'designer' | 'admin' | 'expert' | 'premium' | 'group_buyer' | 'customer'

export type UserLevel = 'standard' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export interface Role {
  id: string
  name: string
  description?: string | null
  createdAt: string
}

export interface Permission {
  id: string
  code: string
  resource?: string | null
  action?: string | null
  description?: string | null
  createdAt: string
}

export interface User {
  id: string
  name: string
  phone: string
  email?: string
  role: UserRole
  level: UserLevel
  avatar?: string
  addresses: Address[]
  orders: Order[]
  createdAt: string
}

export type KycStatus = 'none' | 'pending' | 'verified' | 'rejected'

export interface OtpSession {
  id: string
  phone: string
  codeHash: string
  isVerified: boolean
  expiresAt: string
  createdAt: string
}

export interface KycProfile {
  id: string
  userId: string
  status: KycStatus
  fullName?: string | null
  nationalCodeHash?: string | null
  documentUrl?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}

export interface UserProfile {
  id: string
  userId: string
  avatarUrl?: string | null
  bio?: string | null
  birthDate?: string | null
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

export interface UserAddress {
  id: string
  userId: string
  province: string
  city: string
  street: string
  postalCode?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface UserBankAccount {
  id: string
  userId: string
  bankName: string
  accountNumberHash: string
  accountHolder?: string | null
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

export interface PublicProfile {
  id: string
  userId: string
  displayName: string
  tagline?: string | null
  avatarUrl?: string | null
  rating: number
  createdAt: string
  updatedAt: string
}

export interface Address {
  id: string
  title: string
  province: string
  city: string
  street: string
  postalCode: string
  isDefault: boolean
}

export type ProductCategory = 'ring' | 'necklace' | 'bracelet' | 'earring' | 'pendant' | 'custom'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  description: string
  weight: number
  karat: 18 | 24
  labor: number
  profit: number
  tax: number
  basePrice: number
  finalPrice: number
  stock: number
  images: string[]
  video?: string
  sellerName?: string
  sellerLocation?: string
  stones?: unknown[]
  dimensions?: unknown
  metalColor?: string | null
  lockType?: string | null
  seller?: Seller
  isNew?: boolean
  isFeatured?: boolean
  discount?: number | null
  createdAt: string
}

export interface Seller {
  id: string
  name: string
  rating: number
  location: string
}

export interface OrderItem {
  productId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface CartItemInput {
  product: Product
  quantity: number
  reservedUntil: string
}

export type OrderStatus = 'pending' | 'paid' | 'processing' | 'shipped' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  orderNumber?: string
  userId: string
  items: OrderItem[] | CartItemInput[]
  totalAmount: number
  shippingCost: number
  status: OrderStatus
  address: Address
  trackingCode?: string
  paymentMethod: 'online' | 'wallet'
  createdAt: string
  updatedAt: string
}

export type AuctionStatus =
  | 'pending_review'
  | 'scheduled'
  | 'active'
  | 'extended'
  | 'ended'
  | 'awaiting_payment'
  | 'completed'
  | 'cancelled'
  | 'failed'

export type AuctionPaymentStatus = 'unpaid' | 'escrow_held' | 'paid' | 'settled' | 'refunded' | 'failed'

export type AuctionQualityStatus = 'not_sent' | 'received' | 'under_review' | 'approved' | 'rejected'

export type BidIncrementType = 'amount' | 'percent'

export type AuctionShippingMethod = 'post' | 'tipex' | 'courier'

export interface Auction {
  id: string
  product: Product
  productId?: string | null
  sellerId: string
  sellerName: string
  status: AuctionStatus
  paymentStatus: AuctionPaymentStatus
  qualityStatus: AuctionQualityStatus
  qualityBadge: boolean
  expertName?: string | null
  expertNotes?: string | null
  startingPrice: number
  gold18PriceSnapshot?: number | null
  intrinsicGoldValue?: number | null
  priceSnapshotAt?: string | null
  reservePrice?: number | null
  currentPrice: number
  bidIncrementType: BidIncrementType
  minimumBidIncrement: number
  bidIncrementPercent: number
  bidCount: number
  durationDays: number
  autoExtendMinutes: number
  autoExtendSeconds: number
  paymentWindowMinutes: number
  paymentDeadlineAt?: string | null
  commissionRate: number
  commissionAmount: number
  shippingMethod: AuctionShippingMethod
  shippingCost: number
  reserveMet: boolean
  winningBidderId?: string | null
  winningBidderName?: string | null
  winningAmount?: number | null
  secondWinnerId?: string | null
  secondWinnerName?: string | null
  secondWinnerAmount?: number | null
  isFeatured: boolean
  notes?: string | null
  startsAt: string
  endsAt: string
  createdAt: string
  updatedAt: string
}

export interface AuctionBid {
  id: string
  auctionId: string
  bidderId: string
  bidderName: string
  amount: number
  isWinning: boolean
  createdAt: string
}

export type UsedGoldListingSaleType = 'direct' | 'auction'

export type UsedGoldListingStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'sold'
  | 'cancelled'

export type UsedGoldQualityStatus = 'not_sent' | 'received' | 'under_review' | 'approved' | 'rejected'

export type UsedGoldSource = 'manual' | 'goldeksa_purchase'

export interface UsedGoldListing {
  id: string
  sellerId: string
  sellerName: string
  productId?: string | null
  orderId?: string | null
  vaultAssetId?: string | null
  source: UsedGoldSource
  title: string
  description: string
  weight: number
  karat: number
  gold18PriceSnapshot?: number | null
  intrinsicGoldValue?: number | null
  priceSnapshotAt?: string | null
  stones?: unknown[] | null
  dimensions?: unknown
  metalColor?: string | null
  lockType?: string | null
  images: string[]
  video?: string | null
  saleType: UsedGoldListingSaleType
  fixedPrice?: number | null
  startingPrice?: number | null
  reservePrice?: number | null
  minimumBidIncrement?: number | null
  auctionDurationDays?: number | null
  autoExtendEnabled: boolean
  autoExtendMinutes: number
  autoExtendSeconds: number
  paymentWindowMinutes: number
  commissionRate: number
  qualityStatus: UsedGoldQualityStatus
  qualityBadge: boolean
  expertName?: string | null
  expertNotes?: string | null
  status: UsedGoldListingStatus
  viewCount: number
  favoriteCount: number
  createdAt: string
  updatedAt: string
}

export interface SmartVaultAsset {
  id: string
  userId: string
  productId?: string | null
  orderId?: string | null
  name: string
  category?: string | null
  weight: number
  karat: number
  purchasePrice: number
  purchaseDate: string
  currentRawGoldValue: number
  currentValue: number
  profitLoss: number
  profitLossPercent: number
  images: string[]
  metadata?: unknown
  createdAt: string
  updatedAt: string
}

export interface SmartVaultSummary {
  assetCount: number
  purchaseValue: number
  currentValue: number
  goldWeight: number
  profitLoss: number
  profitLossPercent: number
}

export interface AssetValuationSnapshot {
  id: string
  assetId: string
  userId: string
  rawGoldValue: number
  totalValue: number
  profitLoss: number
  goldPrice: number
  createdAt: string
}

export type PriceAlertTargetType = 'gold_price' | 'asset' | 'portfolio'

export interface PriceAlert {
  id: string
  userId: string
  targetType: PriceAlertTargetType
  targetId?: string | null
  targetPrice: number
  triggerCondition: string
  isActive: boolean
  notifiedAt?: string | null
  createdAt: string
}

export type GroupBuyingStatus = 'draft' | 'open' | 'paid' | 'cancelled' | 'completed'

export type GroupBuyingPaymentMode = 'leader' | 'member'

export type GroupBuyingMemberStatus = 'invited' | 'joined' | 'paid' | 'left'

export interface GroupBuyingGroup {
  id: string
  leaderId: string
  leaderName: string
  title: string
  status: GroupBuyingStatus
  paymentMode: GroupBuyingPaymentMode
  targetAmount: number
  discountRate: number
  inviteCode: string
  orderId?: string | null
  createdAt: string
  updatedAt: string
}

export interface GroupBuyingItem {
  id: string
  groupId: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  createdAt: string
}

export interface GroupBuyingMember {
  id: string
  groupId: string
  userId: string
  userName: string
  shareAmount: number
  paidAmount: number
  status: GroupBuyingMemberStatus
  createdAt: string
}

export interface GroupBuyingTracking {
  orderId: string | null
  orderStatus: OrderStatus | null
  trackingCode: string | null
  shipments: Shipment[]
  history: OrderStatusHistory[]
}

export type DesignChallengeStatus = 'draft' | 'active' | 'ended' | 'cancelled'

export interface DesignChallenge {
  id: string
  title: string
  description: string
  theme: string
  startDate: string
  endDate: string
  rewardType?: string | null
  rewardValue: number
  status: DesignChallengeStatus
  winnerPostId?: string | null
  createdAt: string
  updatedAt: string
}

export type DesignPostStatus = 'draft' | 'published' | 'hidden'

export interface DesignPost {
  id: string
  userId: string
  userName: string
  title: string
  description: string
  imageUrl?: string | null
  modelUrl?: string | null
  challengeId?: string | null
  likesCount: number
  commentsCount: number
  status: DesignPostStatus
  createdAt: string
  updatedAt: string
}

export interface DesignComment {
  id: string
  postId: string
  userId: string
  userName: string
  body: string
  createdAt: string
}

export interface SubscriptionPlan {
  id: string
  name: string
  level: UserLevel | 'premium' | 'pro' | 'vip'
  price: number
  durationDays: number
  features?: string[] | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface DiscountCode {
  id: string
  code: string
  description?: string | null
  discountType: 'percent' | 'fixed'
  discountValue: number
  minPurchase: number
  expiresAt?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type NotificationChannel = 'in_app' | 'sms' | 'push' | 'email'

export interface Notification {
  id: string
  userId?: string | null
  type: string
  title: string
  message: string
  channel: NotificationChannel
  isRead: boolean
  metadata?: unknown
  readAt?: string | null
  createdAt: string
}

export type JewelryDesignCategory = 'ring' | 'necklace' | 'bracelet' | 'earring' | 'pendant'

export type JewelryDesignStatus = 'draft' | 'in_progress' | 'ready_for_review' | 'approved' | 'rejected'

export interface JewelryDesign {
  id: string
  userId: string
  userName: string
  title: string
  category: JewelryDesignCategory
  baseType: string
  weight: number
  karat: number
  metalColor?: string | null
  stones?: unknown[]
  dimensions?: unknown
  imageUrl?: string | null
  modelUrl?: string | null
  preview3dUrl?: string | null
  estimatedGoldPrice: number
  laborCost: number
  profit: number
  tax: number
  totalPrice: number
  status: JewelryDesignStatus
  createdAt: string
  updatedAt: string
}

export interface JewelryDesignVersion {
  id: string
  designId: string
  version: number
  changes: unknown
  totalPrice: number
  modelUrl?: string | null
  createdAt: string
}

export interface GemstoneLibrary {
  id: string
  name: string
  type: string
  color?: string | null
  pricePerCarat: number
  stock: number
  imageUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CustomBuilderQuote {
  id: string
  designId?: string | null
  userId: string
  goldPriceSnapshot: number
  goldWeight: number
  laborCost: number
  profit: number
  tax: number
  total: number
  expiresAt?: string | null
  status: string
  createdAt: string
}

export interface AiPricePrediction {
  id: string
  targetType: string
  targetId?: string | null
  currentPrice: number
  predictedPrice: number
  confidenceScore: number
  horizonDays: number
  modelVersion: string
  features?: unknown
  createdAt: string
}

export interface AiDesignRecommendation {
  id: string
  userId: string
  designId?: string | null
  productIds: string[]
  score: number
  reason: string
  source: string
  createdAt: string
}

export type AiMatchStatus = 'pending' | 'sent' | 'accepted' | 'rejected'

export interface AiMarketMatch {
  id: string
  buyerId: string
  sellerId: string
  listingId?: string | null
  score: number
  reason: string
  status: AiMatchStatus
  createdAt: string
}

export interface AiServiceMetric {
  id: string
  name: string
  value: number
  metadata?: unknown
  createdAt: string
}

export type AiTaskKey =
  | 'analysis'
  | 'assistant'
  | 'code'
  | 'architecture'
  | 'kyc_document'
  | 'safety_check'
  | 'marketing_image'
  | 'vector_asset'
  | 'product_image'
  | 'image_workflow'
  | 'text'
  | 'image_to_text'
  | 'notification'
  | 'content'
  | 'rag'
  | 'summary'
  | 'image_generation'

export interface AiProviderPublicConfig {
  key: AiTaskKey
  label: string
  modelId: string
  envKey: string
  modelEnvKey: string
  capabilities: string[]
  configured: boolean
}

export interface RunAiTaskInput {
  task?: AiTaskKey
  modelId?: string
  prompt?: string
  systemPrompt?: string
  context?: unknown
  documents?: string[]
  imageUrl?: string
  imageBase64?: string
  temperature?: number
  maxTokens?: number
  title?: string
  slug?: string
  saveAsPage?: boolean
  userId?: string | null
  channel?: NotificationChannel
  createDailyNotification?: boolean
  negativePrompt?: string
  width?: number
  height?: number
  steps?: number
  imageConfig?: Record<string, unknown>
}

export interface AiRunResult {
  task: AiTaskKey
  provider: AiProviderPublicConfig
  model: string
  output: string
  usage?: unknown
  raw: unknown
  metadata?: Record<string, unknown>
}

export type EscrowPaymentStatus = 'initiated' | 'held' | 'shipped' | 'released' | 'refunded' | 'disputed' | 'cancelled'

export interface EscrowPayment {
  id: string
  listingId?: string | null
  auctionId?: string | null
  orderId?: string | null
  buyerId: string
  sellerId: string
  amount: number
  fee: number
  status: EscrowPaymentStatus
  authority?: string | null
  paymentUrl?: string | null
  trackingCode?: string | null
  disputeReason?: string | null
  disputedBy?: string | null
  disputedAt?: string | null
  resolutionNote?: string | null
  resolvedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface MarketplaceRating {
  id: string
  reviewerId: string
  revieweeId: string
  listingId?: string | null
  orderId?: string | null
  rating: number
  body?: string | null
  category: string
  createdAt: string
}

export type PaymentTransactionStatus = 'initiated' | 'pending' | 'paid' | 'failed' | 'refunded'

export interface PaymentTransaction {
  id: string
  orderId?: string | null
  auctionId?: string | null
  escrowId?: string | null
  userId: string
  amount: number
  paymentMethod: string
  status: PaymentTransactionStatus
  authority?: string | null
  referenceId?: string | null
  trackingCode?: string | null
  paidAt?: string | null
  createdAt: string
}

export interface OrderTrackingEvent {
  id: string
  orderId: string
  status: string
  location?: string | null
  description?: string | null
  createdAt: string
}

export interface ProductCategoryMaster {
  id: string
  name: string
  slug?: string | null
  description?: string | null
  iconUrl?: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface OccasionCategory {
  id: string
  name: string
  slug?: string | null
  isActive: boolean
  createdAt: string
}

export interface ProductMedia {
  id: string
  productId: string
  type: string
  url: string
  alt?: string | null
  sortOrder: number
  createdAt: string
}

export interface Stone {
  id: string
  name: string
  type: string
  color?: string | null
  pricePerCarat: number
  isActive: boolean
  createdAt: string
}

export interface ProductStone {
  id: string
  productId: string
  stoneId: string
  carat: number
  position?: string | null
  createdAt: string
}

export interface Inventory {
  id: string
  productId: string
  stock: number
  reservedStock: number
  warehouse?: string | null
  createdAt: string
  updatedAt: string
}

export interface SellerProfile {
  id: string
  userId: string
  storeName: string
  description?: string | null
  location?: string | null
  rating: number
  isVerified: boolean
  createdAt: string
  updatedAt: string
}

export interface Cart {
  id: string
  userId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CartItem {
  id: string
  cartId: string
  productId: string
  name: string
  quantity: number
  unitPrice: number
  totalPrice: number
  reservedUntil?: string | null
  createdAt: string
  updatedAt: string
}

export interface Wallet {
  id: string
  userId: string
  balance: number
  goldBalanceGrams: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface WalletTransaction {
  id: string
  walletId: string
  userId: string
  type: string
  amount: number
  orderId?: string | null
  escrowId?: string | null
  payoutRequestId?: string | null
  description?: string | null
  createdAt: string
}

export type PayoutRequestStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected' | 'failed'

export interface PayoutRequest {
  id: string
  userId: string
  bankAccountId: string
  amount: number
  status: PayoutRequestStatus
  idempotencyKey: string
  providerReference?: string | null
  failureReason?: string | null
  createdAt: string
  updatedAt: string
  paidAt?: string | null
}

export interface PricingRule {
  id: string
  name: string
  description?: string | null
  laborRate: number
  profitRate: number
  taxRate: number
  isActive: boolean
  createdAt: string
}

export interface PricingSpread {
  id: string
  productCategory: string
  spreadPercent: number
  isActive: boolean
  createdAt: string
}

export interface TaxRule {
  id: string
  productCategory?: string | null
  taxRate: number
  isActive: boolean
  createdAt: string
}

export interface LaborCostRule {
  id: string
  productCategory: string
  baseLabor: number
  perGramLabor: number
  isActive: boolean
  createdAt: string
}

export interface LiquidityRequest {
  id: string
  userId: string
  assetId?: string | null
  listingId?: string | null
  expectedPrice: number
  status: string
  notes?: string | null
  createdAt: string
}

export interface SellRecommendation {
  id: string
  userId: string
  assetId?: string | null
  recommendedPrice: number
  liquidityScore: number
  reason: string
  createdAt: string
}

export interface BuyerRequest {
  id: string
  userId: string
  category?: string | null
  minWeight: number
  maxWeight: number
  budget: number
  status: string
  createdAt: string
}

export interface ArModel {
  id: string
  productId?: string | null
  designId?: string | null
  name: string
  modelUrl: string
  thumbnailUrl?: string | null
  isActive: boolean
  createdAt: string
}

export interface ArPreview {
  id: string
  userId: string
  modelId: string
  screenshotUrl?: string | null
  videoUrl?: string | null
  isShared: boolean
  createdAt: string
}

export interface ContentPage {
  id: string
  title: string
  slug: string
  body: string
  coverUrl?: string | null
  isPublished: boolean
  createdAt: string
  updatedAt: string
}

export interface Promotion {
  id: string
  title: string
  description?: string | null
  discountValue: number
  discountType: string
  isActive: boolean
  createdAt: string
}

export interface AdCampaign {
  id: string
  title: string
  brandName: string
  description?: string | null
  budget: number
  isActive: boolean
  createdAt: string
}

export interface AuditLog {
  id: string
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: unknown
  createdAt: string
}

export interface EventLog {
  id: string
  name: string
  aggregateType?: string | null
  aggregateId?: string | null
  payload?: unknown
  createdAt: string
}

export interface SystemSetting {
  id: string
  key: string
  value: unknown
  description?: string | null
  createdAt: string
  updatedAt: string
}

export interface NotificationPreference {
  id: string
  userId: string
  inApp: boolean
  sms: boolean
  push: boolean
  email: boolean
  createdAt: string
  updatedAt: string
}

export interface UserFollow {
  id: string
  followerId: string
  followingId: string
  createdAt: string
}

export interface DesignSave {
  id: string
  userId: string
  postId?: string | null
  designId?: string | null
  createdAt: string
}

export interface UserBadge {
  id: string
  userId: string
  name: string
  description?: string | null
  iconUrl?: string | null
  createdAt: string
}

export interface ChallengeReward {
  id: string
  challengeId: string
  postId?: string | null
  userId: string
  rewardType: string
  rewardValue: number
  createdAt: string
}

export interface OrderStatusHistory {
  id: string
  orderId: string
  status: string
  note?: string | null
  createdAt: string
}

export interface Shipment {
  id: string
  orderId: string
  carrier?: string | null
  trackingCode?: string | null
  status: string
  createdAt: string
}

export interface Invoice {
  id: string
  orderId: string
  invoiceNumber: string
  totalAmount: number
  pdfUrl?: string | null
  createdAt: string
}

export interface Refund {
  id: string
  orderId: string
  amount: number
  reason: string
  status: string
  createdAt: string
}

export interface OrderCancellation {
  id: string
  orderId: string
  reason: string
  status: string
  createdAt: string
}

export type GoldPriceType = 'mizaneh' | 'coin' | 'ounce' | 'gold18'

export interface GoldPrice {
  type: GoldPriceType
  value: number
  change: number
  changePercent: number
  updatedAt: string
}

export interface PriceBreakdown {
  rawGold: number
  labor: number
  profit: number
  tax: number
  shipping: number
  total: number
}

export interface Task {
  id: string
  title: string
  description: string
  phase: 'mvp' | 'phase2' | 'phase3'
  status: 'todo' | 'in-progress' | 'review' | 'done'
  priority: 'low' | 'medium' | 'high' | 'critical'
  assignee?: string
  dueDate: string
  createdAt: string
}

export interface DashboardStats {
  totalUsers: number
  totalOrders: number
  totalRevenue: number
  activeProducts: number
  todayOrders: number
  todayRevenue: number
}

export interface AdminStats {
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
}
