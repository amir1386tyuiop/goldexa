import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PricingService } from './pricing.service'
import { PricingRule } from './pricing-rule.entity'
import { PricingSpread } from './pricing-spread.entity'
import { TaxRule } from './tax-rule.entity'
import { LaborCostRule } from './labor-cost-rule.entity'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'
import { CacheService } from '../common/cache.service'

describe('PricingService.calculate (Iranian retail formula)', () => {
  let service: PricingService

  const rule = { laborRate: 10, profitRate: 7, taxRate: 9 }
  const goldPricing = {
    getPriceByType: jest.fn(async (type: GoldPriceType) =>
      type === GoldPriceType.GOLD_18 ? { value: 1_000_000 } : null,
    ),
  }
  const cache = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  }

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: getRepositoryToken(PricingRule), useValue: { findOne: jest.fn(async () => rule) } },
        { provide: getRepositoryToken(PricingSpread), useValue: { findOneBy: jest.fn(async () => null) } },
        { provide: getRepositoryToken(TaxRule), useValue: { findOneBy: jest.fn(async () => null) } },
        { provide: getRepositoryToken(LaborCostRule), useValue: { findOneBy: jest.fn(async () => null) } },
        { provide: GoldPricingService, useValue: goldPricing },
        { provide: CacheService, useValue: cache },
      ],
    }).compile()

    service = moduleRef.get(PricingService)
    jest.clearAllMocks()
  })

  it('uses the live gold price when none is provided', async () => {
    const result = await service.calculate('ring', 1)
    expect(goldPricing.getPriceByType).toHaveBeenCalledWith(GoldPriceType.GOLD_18)
    expect(result.pricePerGram).toBe(1_000_000)
    expect(result.rawGold).toBe(1_000_000)
  })

  it('applies VAT only to (labor + profit), never to the gold value', async () => {
    // weight=10, price=1,000,000 → rawGold=10,000,000
    // labor = 10% of rawGold = 1,000,000
    // profit = 7% of (rawGold + labor) = 7% of 11,000,000 = 770,000
    // VAT = 9% of (labor + profit) = 9% of 1,770,000 = 159,300
    const r = await service.calculate('ring', 10)
    expect(r.rawGold).toBe(10_000_000)
    expect(r.labor).toBe(1_000_000)
    expect(r.profit).toBe(770_000)
    expect(r.tax).toBe(159_300)
    expect(r.total).toBe(10_000_000 + 1_000_000 + 770_000 + 159_300)
  })

  it('does NOT tax the gold itself (regression guard for the VAT bug)', async () => {
    const r = await service.calculate('ring', 10)
    const taxedWholeAmount = Math.round((r.rawGold + r.labor + r.profit) * 0.09)
    // The buggy formula would have produced this much larger tax.
    expect(r.tax).toBeLessThan(taxedWholeAmount)
  })

  it('rejects an invalid weight', async () => {
    await expect(service.calculate('ring', 0)).rejects.toThrow()
  })

  it('ignores an attempted client-supplied gold price and always reads the live price', async () => {
    const result = await Reflect.apply(service.calculate, service, ['ring', 1, 1])

    expect(result.pricePerGram).toBe(1_000_000)
    expect(result.rawGold).toBe(1_000_000)
    expect(goldPricing.getPriceByType).toHaveBeenCalledWith(GoldPriceType.GOLD_18)
  })

  it('stores a five-minute quote through the namespaced cache', async () => {
    const result = await service.createQuote('ring', 1)

    expect(result.ttlSeconds).toBe(300)
    expect(cache.set).toHaveBeenCalledWith(
      expect.stringMatching(/^pricing:quote:Q-/),
      expect.objectContaining({
        breakdown: expect.objectContaining({ category: 'ring', goldWeight: 1 }),
        expiresAt: expect.any(Number),
      }),
      300,
    )
  })

  it('reads a valid quote from the shared cache', async () => {
    const expiresAt = Date.now() + 60_000
    const breakdown = await service.calculate('ring', 1)
    cache.get.mockResolvedValueOnce({ breakdown, expiresAt })

    await expect(service.getQuote('Q-shared')).resolves.toEqual(
      expect.objectContaining({ quoteId: 'Q-shared', valid: true, total: breakdown.total }),
    )
    expect(cache.get).toHaveBeenCalledWith('pricing:quote:Q-shared')
  })

  it('invalidates an expired cached quote', async () => {
    const quoteId = 'Q-expired'
    cache.get.mockResolvedValueOnce({ breakdown: await service.calculate('ring', 1), expiresAt: Date.now() - 1 })

    await expect(service.getQuote(quoteId)).resolves.toEqual({ quoteId, valid: false, reason: 'expired' })
    expect(cache.del).toHaveBeenCalledWith('pricing:quote:Q-expired')
  })

  it('returns not_found when the cache fallback has no quote', async () => {
    cache.get.mockResolvedValueOnce(null)

    await expect(service.getQuote('Q-missing')).resolves.toEqual({
      quoteId: 'Q-missing',
      valid: false,
      reason: 'not_found',
    })
  })
})
