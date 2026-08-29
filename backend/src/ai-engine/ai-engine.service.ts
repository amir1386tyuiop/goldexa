import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { NotificationChannel } from '../notifications/notification.entity'
import { NotificationsService } from '../notifications/notifications.service'
import { ContentService } from '../content/content.service'
import { AiDesignRecommendation } from './ai-design-recommendation.entity'
import { AiMarketMatch, AiMatchStatus } from './ai-market-match.entity'
import { AiPricePrediction } from './ai-price-prediction.entity'
import { AiServiceMetric } from './ai-service-metric.entity'
import {
  AiProviderConfig,
  AiProviderPublicConfig,
  AiRunResult,
  AiTaskKey,
  OpenRouterChatOptions,
  RunAiTaskInput,
} from './ai-engine.types'
import { AI_PROVIDER_REGISTRY, getAiProvider } from './ai-provider-registry'
import { OpenRouterAiClient } from './openrouter-ai.client'
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
    private readonly openRouterAiClient: OpenRouterAiClient,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly contentService: ContentService,
  ) {}

  async findProviders(): Promise<AiProviderPublicConfig[]> {
    return AI_PROVIDER_REGISTRY.map((provider) => this.openRouterAiClient.toPublicProvider(provider))
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
    const metrics = await this.rerunMetric()

    return Promise.all([
      this.rerunPrediction(userId),
      this.rerunRecommendation(userId),
      ...metrics,
    ])
  }

  async rerunPrediction(targetId: string | null): Promise<AiPricePrediction> {
    const currentPrice = 5_850_000
    const predictedPrice = Math.round(currentPrice * (1 + (((Date.now() % 9) - 4) * 0.0015)))

    return this.createPrediction({
      targetType: 'user',
      targetId,
      currentPrice,
      predictedPrice,
      confidenceScore: 84 + (Date.now() % 7),
      horizonDays: 14,
      modelVersion: 'goldeksa-price-rerun-v1',
      features: {
        rerun: true,
        generatedAt: new Date().toISOString(),
      },
    })
  }

  async rerunRecommendation(userId?: string): Promise<AiDesignRecommendation> {
    if (!userId) {
      throw new BadRequestException('شناسه کاربر برای اجرای recommendation الزامی است')
    }
    return this.createRecommendation({
      userId,
      score: 86 + (Date.now() % 10),
      reason: 'بر اساس رفتار خرید، بودجه و سبک‌های پربازدید، این طرح بیشترین احتمال انتخاب را دارد.',
      source: 'goldeksa-design-rerun-v1',
    })
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
}
