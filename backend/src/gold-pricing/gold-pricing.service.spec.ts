import { GoldPrice, GoldPriceType } from './gold-price.entity'
import { GoldPricingService } from './gold-pricing.service'

describe('GoldPricingService external-source fallback', () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    jest.restoreAllMocks()
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = originalNodeEnv
  })

  function build(existing: GoldPrice | null) {
    const repository = {
      findOne: jest.fn(({ where }: { where: { type: GoldPriceType } }) => Promise.resolve(where.type === existing?.type ? existing : null)),
      create: jest.fn((value) => value),
    }
    const config = { get: jest.fn((key: string) => key === 'GOLD_PRICE_SOURCE' ? 'tgju' : undefined) }
    const cache = { get: jest.fn(), set: jest.fn(), del: jest.fn(), driver: 'memory' }
    const audit = { record: jest.fn().mockResolvedValue(undefined) }
    const service = new GoldPricingService(repository as never, {} as never, config as never, cache as never, audit as never)
    return { service, repository }
  }

  it('uses the last valid database price when TGJU is unavailable', async () => {
    const existing = { type: GoldPriceType.GOLD_18, value: 3_600_000, isValid: true } as GoldPrice
    const { service } = build(existing)
    const fetchFromTgju = jest.spyOn(service as any, 'fetchFromTgju')
    fetchFromTgju.mockRejectedValue(new Error('network down'))
    const getMockPrices = jest.spyOn(service as any, 'getMockPrices')

    const prices = await (service as any).fetchFromExternalAPI()

    expect(prices).toEqual([existing])
    expect(getMockPrices).not.toHaveBeenCalled()
  })

  it('fails closed when an external source is configured but no valid price exists', async () => {
    process.env.NODE_ENV = 'development'
    const { service } = build(null)
    const fetchFromTgju = jest.spyOn(service as any, 'fetchFromTgju')
    fetchFromTgju.mockRejectedValue(new Error('network down'))

    await expect((service as any).fetchFromExternalAPI()).rejects.toThrow('هیچ قیمت معتبر قبلی')
  })
})
