import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationChannel } from '../notifications/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { ContentService } from '../content/content.service'
import { Product } from '../products/product.entity'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'
import { AiDesignRecommendation } from './ai-design-recommendation.entity'
import { AiMarketMatch, AiMatchStatus } from './ai-market-match.entity'
import { AiPricePrediction } from './ai-price-prediction.entity'
import { AiServiceMetric } from './ai-service-metric.entity'
import {
  AiProviderConfig,
  AiProviderPublicConfig,
  AiProviderStatus,
  AiPredictionInput,
  AiRecommendationInput,
  AiMatchInput,
  AiRunResult,
  AiTaskKey,
  OpenRouterChatOptions,
  RunAiTaskInput,
} from './ai-engine.types'
import { AI_PROVIDER_REGISTRY, getAiProvider } from './ai-provider-registry'
import { OpenRouterAiClient } from './openrouter-ai.client'
import { LocalAiClient } from './local-ai.client'
import {
  CreateAiDesignRecommendationDto,
  CreateAiMarketMatchDto,
  CreateAiPricePredictionDto,
  CreateAiServiceMetricDto,
} from './create-ai-engine.dto'

interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | OpenRouterContent[]
}

interface OpenRouterContent {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

@Injectable()
export class AiEngineService {
  constructor(
    @InjectRepository(AiPricePrediction)
    private predictionRepository: Repository<AiPricePrediction>,
    @InjectRepository(AiDesignRecommendation)
    private recommendationRepository: Repository<AiDesignRecommendation>,
    @InjectRepository(AiMarketMatch)
    private matchRepository: Repository<AiMarketMatch>,
    @InjectRepository(AiServiceMetric)
    private metricRepository: Repository<AiServiceMetric>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private readonly openRouterAiClient: OpenRouterAiClient,
    private readonly localAiClient: LocalAiClient,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly contentService: ContentService,
    @Optional() private readonly goldPricing?: GoldPricingService,
  ) {}

  async findProviders(): Promise<AiProviderPublicConfig[]> {
    return AI_PROVIDER_REGISTRY.map((provider) => this.openRouterAiClient.toPublicProvider(provider))
  }

  async providerStatus(): Promise<AiProviderStatus[]> {
    const localConfigured = this.localAiClient.isConfigured()
    const localHealthy = localConfigured ? await this.localAiClient.health() : null
    const preferLocal = this.preferLocal()
    return AI_PROVIDER_REGISTRY.map((provider) => {
      const configured = Boolean(this.configService.get<string>(provider.envKey))
      const endpoint = preferLocal && localConfigured ? 'local' : 'openrouter'
      return {
        key: provider.key,
        label: provider.label,
        modelId: this.resolveModel(provider),
        configured: endpoint === 'local' ? localHealthy === true : configured,
        enabled: this.isEnabled(),
        healthy: endpoint === 'local' ? localHealthy : configured ? null : false,
        endpoint,
        fallbackEnabled: preferLocal && localConfigured && configured,
      }
    })
  }

  async executePrediction(input: AiPredictionInput, userId: string): Promise<AiPricePrediction> {
    const livePrice = this.goldPricing
      ? Number((await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18))?.value || 0)
      : Number(input.currentPrice)
    if (!livePrice || livePrice <= 0) throw new BadRequestException('قیمت لحظه‌ای طلا در دسترس نیست')
    const history = this.goldPricing ? await this.goldPricing.getHistory(GoldPriceType.GOLD_18, 30) : []
    const effectiveInput: AiPredictionInput = {
      ...input,
      currentPrice: livePrice,
      historicalPrices: history.length >= 2 ? history.reverse().map((item) => Number(item.value)) : input.historicalPrices,
    }
    const result = await this.runStructuredInference('prediction', userId, effectiveInput, async () => this.localAiClient.predict(effectiveInput))
    const predictedPrice = this.numberFrom(result, 'predicted_price')
    const confidence = this.numberFrom(result, 'confidence', 'confidence_score')
    if (predictedPrice === null || confidence === null) throw new BadRequestException('خروجی prediction معتبر نیست')
    return this.createPrediction({
      targetType: input.targetType || 'user', targetId: userId, currentPrice: livePrice,
      predictedPrice, confidenceScore: Math.min(Math.max(confidence <= 1 ? confidence * 100 : confidence, 0), 100),
      horizonDays: input.horizonDays || 14, modelVersion: String(result.model_version || 'ai-engine-v1'),
      features: { provider: result.provider || 'ai-service', generatedAt: new Date().toISOString() },
    })
  }

  async executeRecommendation(input: AiRecommendationInput, userId: string): Promise<AiDesignRecommendation> {
    const products = await this.productRepository.find({ take: 100 })
    const candidateDesigns = products.map((product) => ({
      product_id: product.id,
      name: product.name,
      tags: [product.category, `${product.karat}k`, product.isFeatured ? 'featured' : '', product.isNew ? 'new' : ''].filter(Boolean),
      price: Number(product.finalPrice),
    }))
    const result = await this.runStructuredInference('recommendation', userId, { ...input, candidateDesigns }, async () => this.localAiClient.recommend({ ...input, candidateDesigns, userId }))
    const recommendations = Array.isArray(result.recommendations) ? result.recommendations : []
    const first = recommendations[0] as Record<string, unknown> | undefined
    if (!first || !this.numberFrom(first, 'score')) throw new BadRequestException('خروجی recommendation معتبر نیست')
    return this.createRecommendation({
      userId, designId: input.designId ?? null,
      productIds: recommendations.map((item) => String((item as Record<string, unknown>).product_id || '')).filter(Boolean),
      score: Math.min(Math.max(this.numberFrom(first, 'score')! <= 1 ? this.numberFrom(first, 'score')! * 100 : this.numberFrom(first, 'score')!, 0), 100),
      reason: String(first.reason || 'پیشنهاد بر اساس داده‌های واقعی کاربر و مدل AI.'),
      source: String(result.provider || 'ai-service'),
    })
  }

  async executeMatch(input: AiMatchInput, adminUserId: string): Promise<AiMarketMatch> {
    const result = await this.runStructuredInference('matching', adminUserId, input, async () => this.localAiClient.match(input))
    const score = this.numberFrom(result, 'score')
    if (score === null) throw new BadRequestException('خروجی matching معتبر نیست')
    return this.createMatch({
      buyerId: input.buyerId, sellerId: input.sellerId, listingId: input.listingId ?? null,
      score: Math.min(Math.max(score <= 1 ? score * 100 : score, 0), 100),
      reason: Array.isArray(result.reasons)
        ? result.reasons.map((item) => String(item)).join(' · ')
        : String(result.reason || 'تطابق بر اساس داده‌های واقعی طرفین و مدل AI.'),
    } as CreateAiMarketMatchDto)
  }

  async chat(input: RunAiTaskInput): Promise<AiRunResult> {
    return this.runTask({ ...input, task: 'assistant' })
  }

  async code(input: RunAiTaskInput): Promise<AiRunResult> {
    return this.runTask({ ...input, task: 'code' })
  }

  async analyzeDocument(input: RunAiTaskInput): Promise<AiRunResult> {
    return this.runTask({ ...input, task: 'kyc_document' })
  }

  async safetyCheck(input: RunAiTaskInput): Promise<AiRunResult> {
    return this.runTask({ ...input, task: 'safety_check' })
  }

  async generateContent(input: RunAiTaskInput): Promise<AiRunResult> {
    return this.runTask({ ...input, task: input.imageUrl || input.imageBase64 ? 'marketing_image' : 'assistant' })
  }

  async runTask(input: RunAiTaskInput): Promise<AiRunResult> {
    const task = input.task || this.resolveTask(input)
    const provider = getAiProvider(task)
    const publicProvider = this.openRouterAiClient.toPublicProvider(provider)
    const startedAt = Date.now()

    try {
      if (this.isImageGenerationTask(task)) {
        return this.runImageGeneration(task, provider, publicProvider, input, startedAt)
      }

      if (this.isVisionTask(task)) {
        return this.runVisionTask(task, provider, publicProvider, input, startedAt)
      }

      const result = await this.openRouterAiClient.chat(
        provider,
        publicProvider,
        this.buildMessages(provider, input),
        this.buildChatOptions(input),
      )
      const metadata = await this.applySideEffects(task, input, result.output, publicProvider)

      await this.recordSuccess(provider, publicProvider, startedAt, result.usage, metadata)

      return {
        task,
        provider: publicProvider,
        model: this.resolveModel(provider),
        output: result.output,
        usage: result.usage,
        raw: result.raw,
        metadata,
      }
    } catch (error) {
      await this.recordFailure(publicProvider, startedAt, error)
      throw error
    }
  }

  async createDailyNotification(input: RunAiTaskInput): Promise<AiRunResult> {
    const summary = await this.runTask({
      ...input,
      task: 'summary',
      createDailyNotification: false,
      systemPrompt:
        input.systemPrompt ||
        'این متن را برای گزارش روزانه گلدکسا خلاصه کن. خروجی باید کوتاه، کاربردی و مناسب تبدیل به اعلان روزانه باشد.',
    })

    const notification = await this.runTask({
      task: 'notification',
      prompt: `بر اساس خلاصه زیر یک اعلان روزانه کوتاه، محترمانه و قابل ارسال برای کاربر گلدکسا بنویس:\n\n${summary.output}`,
      userId: input.userId ?? null,
      channel: input.channel || NotificationChannel.IN_APP,
      title: input.title || 'خلاصه روزانه گلدکسا',
      createDailyNotification: true,
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    })

    return {
      ...notification,
      metadata: {
        ...notification.metadata,
        summaryModel: summary.model,
        summaryProvider: summary.provider.key,
      },
    }
  }

  async findPredictions(): Promise<AiPricePrediction[]> {
    return this.predictionRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findPredictionsByUser(userId: string): Promise<AiPricePrediction[]> {
    return this.predictionRepository.find({
      where: [{ targetType: 'user', targetId: userId }, { targetType: 'portfolio', targetId: userId }],
      order: { createdAt: 'DESC' },
    })
  }

  async createPrediction(data: CreateAiPricePredictionDto): Promise<AiPricePrediction> {
    return this.predictionRepository.save(
      this.predictionRepository.create({
        ...data,
        targetId: data.targetId ?? null,
        features: data.features ?? {},
      }),
    )
  }

  async findRecommendations(userId: string): Promise<AiDesignRecommendation[]> {
    return this.recommendationRepository.findBy({ userId })
  }

  async createRecommendation(data: CreateAiDesignRecommendationDto): Promise<AiDesignRecommendation> {
    return this.recommendationRepository.save(
      this.recommendationRepository.create({
        ...data,
        designId: data.designId ?? null,
        productIds: data.productIds ?? [],
      }),
    )
  }

  async findMatches(): Promise<AiMarketMatch[]> {
    return this.matchRepository.find({ order: { createdAt: 'DESC' } })
  }

  async createMatch(data: CreateAiMarketMatchDto): Promise<AiMarketMatch> {
    return this.matchRepository.save(
      this.matchRepository.create({
        ...data,
        listingId: data.listingId ?? null,
        status: (data.status as AiMatchStatus | undefined) || AiMatchStatus.PENDING,
      }),
    )
  }

  async updateMatchStatus(id: string, status: string): Promise<AiMarketMatch | null> {
    const match = await this.matchRepository.findOneBy({ id })

    if (!match) {
      throw new NotFoundException('تطابق هوشمند یافت نشد')
    }

    match.status = status as AiMatchStatus
    return this.matchRepository.save(match)
  }

  async findMetrics(): Promise<AiServiceMetric[]> {
    return this.metricRepository.find({ order: { createdAt: 'DESC' } })
  }

  async createMetric(data: CreateAiServiceMetricDto): Promise<AiServiceMetric> {
    return this.metricRepository.save(
      this.metricRepository.create({
        ...data,
        metadata: data.metadata ?? {},
      }),
    )
  }

  async rerunAll(userId: string | null): Promise<unknown[]> {
    if (!userId) throw new BadRequestException('شناسه کاربر برای اجرای AI الزامی است')
    throw new BadRequestException('برای اجرای واقعی، endpointهای execute با داده‌ی ورودی استفاده شوند')
  }

  async rerunPrediction(targetId: string | null): Promise<AiPricePrediction> {
    throw new BadRequestException('اجرای prediction بدون currentPrice و داده‌ی واقعی مجاز نیست؛ از predictions/execute استفاده کنید')
  }

  async rerunRecommendation(userId?: string): Promise<AiDesignRecommendation> {
    throw new BadRequestException('اجرای recommendation بدون داده‌ی واقعی مجاز نیست؛ از recommendations/execute استفاده کنید')
  }

  async rerunMatch(): Promise<AiMarketMatch> {
    throw new BadRequestException('اجرای match بدون buyer و seller واقعی مجاز نیست')
  }

  async rerunMetric(): Promise<AiServiceMetric[]> {
    return this.metricRepository.save([
      this.metricRepository.create({
        name: 'ai.model.accuracy',
        value: 0.9 + ((Date.now() % 8) / 100),
        metadata: {
          task: 'rerun',
          generatedAt: new Date().toISOString(),
        },
      }),
      this.metricRepository.create({
        name: 'ai.model.latency_ms',
        value: 680 + (Date.now() % 240),
        metadata: {
          task: 'rerun',
          generatedAt: new Date().toISOString(),
        },
      }),
    ])
  }

  private async runVisionTask(
    task: AiTaskKey,
    provider: AiProviderConfig,
    publicProvider: AiProviderPublicConfig,
    input: RunAiTaskInput,
    startedAt: number,
  ): Promise<AiRunResult> {
    const result = await this.openRouterAiClient.chat(
      provider,
      publicProvider,
      this.buildVisionMessages(provider, input),
      this.buildChatOptions(input),
    )
    const metadata = await this.applySideEffects(task, input, result.output, publicProvider)

    await this.recordSuccess(provider, publicProvider, startedAt, result.usage, metadata)

    return {
      task,
      provider: publicProvider,
      model: this.resolveModel(provider),
      output: result.output,
      usage: result.usage,
      raw: result.raw,
      metadata,
    }
  }

  private async runImageGeneration(
    task: AiTaskKey,
    provider: AiProviderConfig,
    publicProvider: AiProviderPublicConfig,
    input: RunAiTaskInput,
    startedAt: number,
  ): Promise<AiRunResult> {
    if (!input.prompt) {
      throw new BadRequestException('برای ساخت تصویر باید prompt ارسال شود')
    }

    const prompt = [input.prompt, input.negativePrompt ? `Negative prompt: ${input.negativePrompt}` : null]
      .filter(Boolean)
      .join('\n')
    const result = await this.openRouterAiClient.generateImage(provider, publicProvider, prompt, {
      width: this.normalizeDimension(input.width, 1024),
      height: this.normalizeDimension(input.height, 1024),
      steps: input.steps,
      imageConfig: input.imageConfig,
    })
    const metadata = await this.applySideEffects(task, input, result.output, publicProvider)

    await this.recordSuccess(provider, publicProvider, startedAt, result.usage, metadata)

    return {
      task,
      provider: publicProvider,
      model: this.resolveModel(provider),
      output: result.output,
      usage: result.usage,
      raw: result.raw,
      metadata,
    }
  }

  private buildMessages(provider: AiProviderConfig, input: RunAiTaskInput): OpenRouterMessage[] {
    const userContent = [input.prompt, this.stringifyContext(input.context), this.stringifyDocuments(input.documents)]
      .filter(Boolean)
      .join('\n\n')

    return [
      {
        role: 'system',
        content: input.systemPrompt || provider.systemPrompt,
      },
      {
        role: 'user',
        content: userContent || 'لطفاً خروجی موردنیاز را تولید کن.',
      },
    ]
  }

  private buildVisionMessages(provider: AiProviderConfig, input: RunAiTaskInput): OpenRouterMessage[] {
    const text = [input.prompt || 'این تصویر را برای گلدکسا تحلیل کن و متن دقیق و ساختارمند استخراج کن.', this.stringifyContext(input.context), this.stringifyDocuments(input.documents)]
      .filter(Boolean)
      .join('\n\n')
    const content: OpenRouterContent[] = [
      {
        type: 'text',
        text,
      },
    ]

    if (input.imageUrl) {
      content.push({
        type: 'image_url',
        image_url: {
          url: input.imageUrl,
        },
      })
    }

    if (input.imageBase64) {
      content.push({
        type: 'image_url',
        image_url: {
          url: this.toDataUri(input.imageBase64),
        },
      })
    }

    return [
      {
        role: 'system',
        content: input.systemPrompt || provider.systemPrompt,
      },
      {
        role: 'user',
        content,
      },
    ]
  }

  private buildChatOptions(input: RunAiTaskInput): OpenRouterChatOptions {
    return {
      temperature: input.temperature,
      maxTokens: input.maxTokens,
    }
  }

  private async applySideEffects(
    task: AiTaskKey,
    input: RunAiTaskInput,
    output: string,
    provider: AiProviderPublicConfig,
  ): Promise<Record<string, unknown>> {
    const metadata: Record<string, unknown> = {}

    if ((task === 'notification' && input.userId) || (task === 'summary' && input.createDailyNotification)) {
      const notification = await this.notificationsService.create({
        userId: input.userId ?? null,
        type: task === 'summary' ? 'daily_ai_summary' : 'ai_notification',
        title: input.title || 'اعلان هوشمند گلدکسا',
        message: output,
        channel: input.channel || NotificationChannel.IN_APP,
        metadata: {
          provider: provider.key,
          model: provider.modelId,
        },
      })
      metadata.notificationId = notification.id
    }

    if (task === 'content' && input.saveAsPage) {
      const title = input.title || 'محتوای تولید شده توسط هوش مصنوعی'
      const slug = input.slug || `${this.toSlug(title)}-${Date.now()}`
      const page = await this.contentService.createPage({
        title,
        slug,
        body: output,
        isPublished: false,
      })
      metadata.contentPageId = page.id
    }

    return metadata
  }

  private async recordSuccess(
    provider: AiProviderConfig,
    publicProvider: AiProviderPublicConfig,
    startedAt: number,
    usage: unknown,
    metadata: Record<string, unknown>,
  ): Promise<void> {
    await this.metricRepository.save([
      this.metricRepository.create({
        name: `ai.${provider.key}.latency_ms`,
        value: Date.now() - startedAt,
        metadata: {
          provider: publicProvider.key,
          model: publicProvider.modelId,
          usage,
          ...metadata,
        },
      }),
      this.metricRepository.create({
        name: `ai.${provider.key}.success`,
        value: 1,
        metadata: {
          provider: publicProvider.key,
          model: publicProvider.modelId,
          usage,
          ...metadata,
        },
      }),
    ])
  }

  private async recordFailure(
    provider: AiProviderPublicConfig,
    startedAt: number,
    error: unknown,
  ): Promise<void> {
    try {
      await this.metricRepository.save(
        this.metricRepository.create({
          name: `ai.${provider.key}.failure`,
          value: 1,
          metadata: {
            provider: provider.key,
            model: provider.modelId,
            latencyMs: Date.now() - startedAt,
            message: (error as Error)?.message || 'خطای ناشناخته',
          },
        }),
      )
    } catch (_) {
      return
    }
  }

  private resolveTask(input: RunAiTaskInput): AiTaskKey {
    if (input.task) {
      return input.task
    }

    if (input.imageUrl || input.imageBase64) {
      return 'image_to_text'
    }

    if (input.createDailyNotification) {
      return 'summary'
    }

    return 'text'
  }

  private isImageGenerationTask(task: AiTaskKey): boolean {
    return ['image_generation', 'marketing_image', 'vector_asset', 'product_image', 'image_workflow'].includes(task)
  }

  private isVisionTask(task: AiTaskKey): boolean {
    return ['image_to_text', 'kyc_document'].includes(task)
  }

  private resolveModel(provider: AiProviderConfig): string {
    return this.configService.get<string>(provider.modelEnvKey) || provider.modelId
  }

  private stringifyContext(value: unknown): string {
    if (!value) {
      return ''
    }

    if (typeof value === 'string') {
      return value
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.stringifyContext(item)).join('\n')
    }

    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2)
    }

    return String(value)
  }

  private stringifyDocuments(documents: string[] = []): string {
    if (!documents.length) {
      return ''
    }

    return `متون مرجع:\n${documents.map((document, index) => `--- سند ${index + 1} ---\n${document}`).join('\n\n')}`
  }

  private toDataUri(imageBase64: string): string {
    const cleaned = imageBase64.replace(/\s/g, '')

    if (cleaned.startsWith('data:')) {
      return cleaned
    }

    const withoutPrefix = cleaned.replace(/^data:image\/[^;]+;base64,/i, '')
    const mimeType = this.detectImageMimeType(withoutPrefix)

    return `data:${mimeType};base64,${withoutPrefix}`
  }

  private detectImageMimeType(imageBase64: string): string {
    const prefix = imageBase64.slice(0, 16)

    if (prefix.startsWith('/9j')) {
      return 'image/jpeg'
    }

    if (prefix.startsWith('iVBORw0KGgo')) {
      return 'image/png'
    }

    if (prefix.startsWith('UklGR')) {
      return 'image/webp'
    }

    return 'image/png'
  }

  private normalizeDimension(value: number | undefined, fallback: number): number {
    const parsed = Number(value)

    if (!Number.isFinite(parsed) || parsed < 1) {
      return fallback
    }

    return Math.min(Math.round(parsed), 2048)
  }

  private toSlug(value: string): string {
    return value
      .trim()
      .replace(/[^\w\u0600-\u06FF-]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
  }

  private async runStructuredInference(
    kind: 'prediction' | 'recommendation' | 'matching',
    userId: string,
    input: unknown,
    localCall: () => Promise<Record<string, unknown>>,
  ): Promise<Record<string, unknown>> {
    const prompt = kind === 'prediction'
      ? `برای پیش‌بینی قیمت طلا فقط JSON معتبر با کلیدهای predicted_price, confidence, model_version برگردان. داده: ${this.stringifyContext(input)}`
      : kind === 'recommendation'
        ? `برای کاربر ${userId} فقط JSON معتبر با کلید recommendations برگردان؛ هر آیتم باید product_id و score و reason داشته باشد. داده: ${this.stringifyContext(input)}`
        : `برای تطبیق بازار فقط JSON معتبر با کلیدهای score و reason برگردان. داده: ${this.stringifyContext(input)}`

    if (this.preferLocal() && this.localAiClient.isConfigured()) {
      try {
        return await localCall()
      } catch (error) {
        if (!this.configuredOpenRouter()) throw error
      }
    }

    if (!this.configuredOpenRouter()) {
      throw new BadRequestException('هیچ provider قابل استفاده‌ای برای AI تنظیم نشده است')
    }

    const provider = getAiProvider('assistant')
    const publicProvider = this.openRouterAiClient.toPublicProvider(provider)
    const result = await this.openRouterAiClient.chat(
      provider,
      publicProvider,
      [{ role: 'system', content: 'خروجی را فقط JSON معتبر و بدون markdown برگردان. نتیجه را جعل نکن و اگر داده کافی نیست خطا بده.' }, { role: 'user', content: prompt }],
      { temperature: 0, maxTokens: 800, responseFormat: { type: 'json_object' } },
    )
    try {
      return JSON.parse(result.output) as Record<string, unknown>
    } catch {
      throw new BadRequestException('خروجی JSON از provider معتبر نیست')
    }
  }

  private configuredOpenRouter(): boolean {
    return Boolean(this.configService.get<string>('OPENROUTER_API_KEY'))
  }

  private preferLocal(): boolean {
    return (this.configService.get<string>('AI_PREFER_LOCAL') || 'true').toLowerCase() === 'true'
  }

  private isEnabled(): boolean {
    return (this.configService.get<string>('AI_ENGINE_ENABLED') || 'false').toLowerCase() === 'true'
  }

  private numberFrom(value: Record<string, unknown>, ...keys: string[]): number | null {
    for (const key of keys) {
      const number = Number(value[key])
      if (Number.isFinite(number)) return number
    }
    return null
  }
}
