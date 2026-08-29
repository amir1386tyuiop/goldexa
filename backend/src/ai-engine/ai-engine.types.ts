import { NotificationChannel } from '../notifications/notification.entity'

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

export interface AiProviderConfig {
  key: AiTaskKey
  label: string
  modelId: string
  envKey: string
  modelEnvKey: string
  systemPrompt: string
  capabilities: string[]
}

export interface AiProviderPublicConfig {
  key: AiTaskKey
  label: string
  modelId: string
  envKey: string
  modelEnvKey: string
  capabilities: string[]
  configured: boolean
  enabled: boolean
  endpoint: 'openrouter' | 'local'
}

export interface AiProviderStatus {
  key: string
  label: string
  modelId: string
  configured: boolean
  enabled: boolean
  healthy: boolean | null
  endpoint: 'openrouter' | 'local'
  fallbackEnabled: boolean
}

export interface AiPredictionInput {
  currentPrice: number
  historicalPrices?: number[]
  horizonDays?: number
  targetType?: string
  targetId?: string | null
}

export interface AiRecommendationInput {
  userHistory?: string[]
  budget?: number
  style?: string
  designId?: string | null
  candidateDesigns?: Array<{ product_id: string; name: string; tags: string[]; price?: number }>
}

export interface AiMatchInput {
  buyerId: string
  sellerId: string
  listingId?: string | null
  buyerContext?: unknown
  sellerContext?: unknown
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

export interface OpenRouterChatOptions {
  temperature?: number
  maxTokens?: number
  modalities?: Array<'text' | 'image'>
  imageConfig?: Record<string, unknown>
  responseFormat?: unknown
  provider?: unknown
  extraBody?: Record<string, unknown>
}

export interface OpenRouterChatResult {
  output: string
  usage?: unknown
  raw: unknown
}

export interface OpenRouterImageResult {
  output: string
  usage?: unknown
  raw: unknown
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
