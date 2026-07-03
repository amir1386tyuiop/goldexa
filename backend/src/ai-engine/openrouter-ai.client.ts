import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import axios, { AxiosError } from 'axios'
import {
  AiProviderConfig,
  AiProviderPublicConfig,
  OpenRouterChatOptions,
  OpenRouterChatResult,
  OpenRouterImageResult,
} from './ai-engine.types'

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

type OpenRouterResponse = Record<string, unknown>

type OpenRouterImageMessage = {
  type?: string
  image_url?: {
    url?: string
  }
}

@Injectable()
export class OpenRouterAiClient {
  constructor(private readonly configService: ConfigService) {}

  async chat(
    provider: AiProviderConfig,
    publicProvider: AiProviderPublicConfig,
    messages: OpenRouterMessage[],
    options: OpenRouterChatOptions = {},
  ): Promise<OpenRouterChatResult> {
    const model = this.getModel(provider)
    const baseUrl = this.getBaseUrl()
    const body = this.buildChatBody(model, messages, options)

    try {
      const response = await axios.post(`${baseUrl}/chat/completions`, body, {
        headers: this.getHeaders(),
        timeout: 120000,
      })

      const content = this.extractChatContent(response.data)

      return {
        output: content,
        usage: response.data.usage ?? null,
        raw: response.data,
      }
    } catch (error) {
      throw this.toBadRequest(error, publicProvider, model)
    }
  }

  async generateImage(
    provider: AiProviderConfig,
    publicProvider: AiProviderPublicConfig,
    prompt: string,
    options: {
      width?: number
      height?: number
      steps?: number
      imageConfig?: Record<string, unknown>
    } = {},
  ): Promise<OpenRouterImageResult> {
    const model = this.getModel(provider)
    const baseUrl = this.getBaseUrl()
    const imageConfig = this.buildImageConfig(options)

    try {
      const response = await axios.post(
        `${baseUrl}/chat/completions`,
        {
          model,
          modalities: ['image', 'text'],
          messages: [
            {
              role: 'system',
              content: provider.systemPrompt,
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 4096,
          ...(imageConfig ? { image_config: imageConfig } : {}),
        },
        {
          headers: this.getHeaders(),
          timeout: 180000,
        },
      )

      const imageUrl = this.extractImageUrl(response.data)

      if (!imageUrl) {
        throw new InternalServerErrorException({
          message: 'ساخت تصویر با موفقیت انجام نشد و خروجی تصویر دریافت نشد',
          provider: publicProvider.key,
          model,
        })
      }

      return {
        output: imageUrl,
        usage: response.data.usage ?? null,
        raw: response.data,
      }
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error
      }

      throw this.toBadRequest(error, publicProvider, model)
    }
  }

  toPublicProvider(provider: AiProviderConfig): AiProviderPublicConfig {
    return {
      key: provider.key,
      label: provider.label,
      modelId: provider.modelId,
      envKey: provider.envKey,
      modelEnvKey: provider.modelEnvKey,
      capabilities: provider.capabilities,
      configured: Boolean(this.configService.get<string>(provider.envKey)),
    }
  }

  private buildChatBody(model: string, messages: OpenRouterMessage[], options: OpenRouterChatOptions): Record<string, unknown> {
    return {
      model,
      messages,
      temperature: options.temperature ?? 0.3,
      max_tokens: options.maxTokens ?? 1200,
      ...(options.modalities ? { modalities: options.modalities } : {}),
      ...(options.imageConfig ? { image_config: options.imageConfig } : {}),
      ...(options.responseFormat ? { response_format: options.responseFormat } : {}),
      ...(options.provider ? { provider: options.provider } : {}),
      ...(options.extraBody || {}),
    }
  }

  private buildImageConfig(options: { width?: number; height?: number; steps?: number; imageConfig?: Record<string, unknown> }): Record<string, unknown> | null {
    const config: Record<string, unknown> = {
      ...(options.width ? { width: options.width } : {}),
      ...(options.height ? { height: options.height } : {}),
      ...(typeof options.steps === 'number' ? { steps: options.steps } : {}),
      ...(options.imageConfig || {}),
    }

    return Object.keys(config).length ? config : null
  }

  private getHeaders(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.getApiKey()}`,
      'HTTP-Referer': this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5174',
      'X-Title': 'Goldexa AI Engine',
      'Content-Type': 'application/json',
    }
  }

  private getApiKey(): string {
    const key = this.configService.get<string>('OPENROUTER_API_KEY')

    if (!key) {
      throw new BadRequestException('کلید OPENROUTER_API_KEY تنظیم نشده است')
    }

    return key
  }

  private getModel(provider: AiProviderConfig): string {
    return this.configService.get<string>(provider.modelEnvKey) || provider.modelId
  }

  private getBaseUrl(): string {
    return this.configService.get<string>('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1'
  }

  private extractChatContent(data: OpenRouterResponse): string {
    if (typeof data === 'string') {
      return data
    }

    const choices = data.choices as Array<{
      message?: {
        content?: string | OpenRouterContent[]
        images?: OpenRouterImageMessage[]
      }
    }> | undefined

    const image = this.extractFirstImage(choices?.[0]?.message?.images)

    if (image) {
      return image
    }

    if (choices?.[0]?.message?.content) {
      return this.extractContentBlock(choices[0].message.content)
    }

    if (typeof data.output === 'string') {
      return data.output
    }

    if (Array.isArray(data.data)) {
      return JSON.stringify(data.data)
    }

    return JSON.stringify(data)
  }

  private extractContentBlock(content: string | OpenRouterContent[]): string {
    if (typeof content === 'string') {
      return content
    }

    const image = content.find((item) => item.type === 'image_url' && item.image_url?.url)

    if (image?.image_url?.url) {
      return image.image_url.url
    }

    const text = content.find((item) => item.type === 'text')

    return text?.text || ''
  }

  private extractFirstImage(images: OpenRouterImageMessage[] | undefined): string | null {
    const image = images?.find((item) => item.image_url?.url)

    return image?.image_url?.url || null
  }

  private extractImageUrl(data: OpenRouterResponse): string | null {
    if (!data || typeof data !== 'object') {
      return null
    }

    if (typeof data.url === 'string') {
      return data.url
    }

    if (typeof data.image === 'string') {
      return data.image
    }

    if (Array.isArray(data.images) && typeof data.images[0] === 'string') {
      return data.images[0]
    }

    if (Array.isArray(data.data) && typeof data.data[0]?.url === 'string') {
      return data.data[0].url
    }

    const choices = data.choices as Array<{ message?: { images?: OpenRouterImageMessage[] } }> | undefined
    const image = this.extractFirstImage(choices?.[0]?.message?.images)

    if (image) {
      return image
    }

    const output = data.output as { images?: unknown } | undefined

    if (Array.isArray(output?.images) && typeof output.images[0] === 'string') {
      return output.images[0]
    }

    return null
  }

  private toBadRequest(error: unknown, provider: AiProviderPublicConfig, model: string): BadRequestException {
    const axiosError = error as AxiosError<OpenRouterResponse>
    const responseData = axiosError?.response?.data
    const responseError = responseData?.error as { message?: unknown } | undefined
    const message =
      typeof responseError?.message === 'string'
        ? responseError.message
        : (error as Error)?.message || 'خطا در ارتباط با OpenRouter'

    return new BadRequestException({
      message,
      provider: provider.key,
      model,
    })
  }
}
