import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios from 'axios'
import { AiMatchInput, AiPredictionInput, AiRecommendationInput } from './ai-engine.types'

/** Client for the optional first-party AI service. It never invents a result. */
@Injectable()
export class LocalAiClient {
  constructor(private readonly configService: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.baseUrl())
  }

  async health(): Promise<boolean> {
    if (!this.isConfigured()) return false
    try {
      const response = await axios.get(`${this.baseUrl()}/health`, { timeout: this.timeout() })
      return response.status >= 200 && response.status < 300 && response.data?.status === 'healthy'
    } catch {
      return false
    }
  }

  async predict(input: AiPredictionInput): Promise<Record<string, unknown>> {
    return this.post('/predict-price', {
      historical_prices: input.historicalPrices || [input.currentPrice],
      days_ahead: input.horizonDays || 14,
    })
  }

  async recommend(input: AiRecommendationInput & { userId: string }): Promise<Record<string, unknown>> {
    return this.post('/recommend-designs', {
      user_id: input.userId,
      user_history: input.userHistory || [],
      budget: input.budget,
      style: input.style,
      candidate_designs: input.candidateDesigns || [],
    })
  }

  async match(input: AiMatchInput): Promise<Record<string, unknown>> {
    return this.post('/match-market', {
      buyer: { id: input.buyerId, ...this.contextObject(input.buyerContext) },
      seller: { id: input.sellerId, ...this.contextObject(input.sellerContext) },
      listing_price: this.contextNumber(input.sellerContext, 'listingPrice'),
    })
  }

  private contextObject(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  }

  private contextNumber(value: unknown, key: string): number | undefined {
    const number = Number(this.contextObject(value)[key])
    return Number.isFinite(number) && number > 0 ? number : undefined
  }

  private async post(path: string, body: unknown): Promise<Record<string, unknown>> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableException('سرویس AI محلی تنظیم نشده است')
    }
    try {
      const response = await axios.post(`${this.baseUrl()}${path}`, body, { timeout: this.timeout() })
      if (!response.data || typeof response.data !== 'object') {
        throw new Error('پاسخ نامعتبر از سرویس AI محلی')
      }
      return response.data as Record<string, unknown>
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error
      const message = axios.isAxiosError(error) && error.code === 'ECONNABORTED'
        ? 'زمان پاسخ سرویس AI محلی تمام شد'
        : 'سرویس AI محلی در دسترس نیست'
      throw new ServiceUnavailableException(message)
    }
  }

  private baseUrl(): string {
    return (this.configService.get<string>('AI_LOCAL_URL') || '').replace(/\/$/, '')
  }

  private timeout(): number {
    const value = Number(this.configService.get<string>('AI_LOCAL_TIMEOUT_MS') || 8000)
    return Number.isFinite(value) ? Math.min(Math.max(value, 500), 30000) : 8000
  }
}
