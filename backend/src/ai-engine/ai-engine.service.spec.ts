import { BadRequestException } from '@nestjs/common'
import { AiEngineService } from './ai-engine.service'

const repository = () => ({
  create: jest.fn((value) => value),
  save: jest.fn(async (value) => ({ id: 'saved', ...value })),
  find: jest.fn(),
  findBy: jest.fn(),
  findOneBy: jest.fn(),
})

describe('AiEngineService execution contract', () => {
  const config = (values: Record<string, string>) => ({
    get: jest.fn((key: string) => values[key]),
  })

  it('persists a real local prediction using the JWT owner supplied by the controller', async () => {
    const predictionRepository = repository()
    const local = { isConfigured: jest.fn(() => true), predict: jest.fn(async () => ({ predicted_price: 6100000, confidence: 0.9 })) }
    const service = new AiEngineService(
      predictionRepository as never, repository() as never, repository() as never, repository() as never,
      repository() as never, { toPublicProvider: jest.fn(), chat: jest.fn() } as never, local as never,
      config({ AI_PREFER_LOCAL: 'true' }) as never, {} as never, {} as never,
    )

    const result = await service.executePrediction({ currentPrice: 6000000, horizonDays: 7 }, 'jwt-user')

    expect(local.predict).toHaveBeenCalledWith({ currentPrice: 6000000, horizonDays: 7 })
    expect(predictionRepository.create).toHaveBeenCalledWith(expect.objectContaining({ targetId: 'jwt-user', predictedPrice: 6100000, confidenceScore: 90 }))
    expect(result.id).toBe('saved')
  })

  it('falls back to OpenRouter only after local failure and rejects non-JSON output', async () => {
    const openRouter = {
      toPublicProvider: jest.fn(() => ({ key: 'assistant', modelId: 'model', configured: true })),
      chat: jest.fn(async () => ({ output: '{"predicted_price":6200000,"confidence":0.8}', raw: {} })),
    }
    const local = { isConfigured: jest.fn(() => true), predict: jest.fn(async () => { throw new Error('down') }) }
    const predictionRepository = repository()
    const service = new AiEngineService(
      predictionRepository as never, repository() as never, repository() as never, repository() as never,
      repository() as never, openRouter as never, local as never,
      config({ AI_PREFER_LOCAL: 'true', OPENROUTER_API_KEY: 'configured' }) as never, {} as never, {} as never,
    )

    await expect(service.executePrediction({ currentPrice: 6000000 }, 'jwt-user')).resolves.toEqual(expect.objectContaining({ id: 'saved' }))
    expect(openRouter.chat).toHaveBeenCalledTimes(1)

    openRouter.chat.mockResolvedValueOnce({ output: 'not-json', raw: {} })
    await expect(service.executePrediction({ currentPrice: 6000000 }, 'jwt-user')).rejects.toBeInstanceOf(BadRequestException)
  })

  it('keeps the local design chat as the preferred workspace even when OpenRouter is configured', async () => {
    const openRouter = {
      toPublicProvider: jest.fn(() => ({ key: 'assistant', modelId: 'local-design-builder-v1', configured: true })),
      chat: jest.fn(),
    }
    const local = { isConfigured: jest.fn(() => true), health: jest.fn(), predict: jest.fn(), recommend: jest.fn(), match: jest.fn() }
    const service = new AiEngineService(
      repository() as never, repository() as never, repository() as never, repository() as never,
      repository() as never, openRouter as never, local as never,
      config({ AI_PREFER_LOCAL: 'true', OPENROUTER_API_KEY: 'configured' }) as never,
      {} as never, {} as never, { getPriceByType: jest.fn(async () => ({ value: 6000000 })) } as never,
    )

    const result = await service.chat({ task: 'assistant', prompt: 'یک انگشتر مینیمال ۳ گرم طراحی کن', userId: 'user-1' })

    expect(result.raw).toEqual(expect.objectContaining({ design: expect.objectContaining({ weight: 3 }) }))
    expect(openRouter.chat).not.toHaveBeenCalled()
  })

  it('forwards an explicitly selected allow-listed model to OpenRouter', async () => {
    const openRouter = {
      toPublicProvider: jest.fn((provider) => ({ key: provider.key, modelId: 'default/model', configured: true })),
      chat: jest.fn(async () => ({ output: 'ok', raw: {}, usage: {} })),
    }
    const service = new AiEngineService(
      repository() as never, repository() as never, repository() as never, repository() as never,
      repository() as never, openRouter as never, { isConfigured: jest.fn(() => false) } as never,
      config({ AI_ENGINE_ENABLED: 'true', OPENROUTER_ALLOWED_MODELS: 'allowed/model' }) as never,
      {} as never, {} as never,
    )

    await service.runTask({ task: 'assistant', prompt: 'طرح انگشتر', modelId: 'allowed/model' })

    expect(openRouter.chat).toHaveBeenCalledWith(
      expect.anything(), expect.anything(), expect.any(Array), expect.any(Object), 'allowed/model',
    )
  })

  it('rejects a model that is not in the configured allow-list', async () => {
    const openRouter = { toPublicProvider: jest.fn((provider) => ({ key: provider.key, modelId: 'default/model' })), chat: jest.fn() }
    const service = new AiEngineService(
      repository() as never, repository() as never, repository() as never, repository() as never,
      repository() as never, openRouter as never, { isConfigured: jest.fn(() => false) } as never,
      config({ AI_ENGINE_ENABLED: 'true', OPENROUTER_ALLOWED_MODELS: 'allowed/model' }) as never,
      {} as never, {} as never,
    )

    await expect(service.runTask({ task: 'assistant', prompt: 'طرح انگشتر', modelId: 'unknown/model' }))
      .rejects.toBeInstanceOf(BadRequestException)
    expect(openRouter.chat).not.toHaveBeenCalled()
  })
})
