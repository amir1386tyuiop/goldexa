import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { PricingService } from './pricing.service'
import { PricingRule } from './pricing-rule.entity'
import { PricingSpread } from './pricing-spread.entity'
import { TaxRule } from './tax-rule.entity'
import { LaborCostRule } from './labor-cost-rule.entity'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'

describe('PricingService.calculate (Iranian retail formula)', () => {
  let service: PricingService

  const rule = { laborRate: 10, profitRate: 7, taxRate: 9 }
  const goldPricing = {
    getPriceByType: jest.fn(async (type: GoldPriceType) =>
      type === GoldPriceType.GOLD_18 ? { value: 1_000_000 } : null,
    ),
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
      ],
    }).compile()

    service = moduleRef.get(PricingService)
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
    const r = await service.calculate('ring', 10, 1_000_000)
    expect(r.rawGold).toBe(10_000_000)
    expect(r.labor).toBe(1_000_000)
    expect(r.profit).toBe(770_000)
    expect(r.tax).toBe(159_300)
    expect(r.total).toBe(10_000_000 + 1_000_000 + 770_000 + 159_300)
  })

  it('does NOT tax the gold itself (regression guard for the VAT bug)', async () => {
    const r = await service.calculate('ring', 10, 1_000_000)
    const taxedWholeAmount = Math.round((r.rawGold + r.labor + r.profit) * 0.09)
    // The buggy formula would have produced this much larger tax.
    expect(r.tax).toBeLessThan(taxedWholeAmount)
  })

  it('rejects an invalid weight', async () => {
    await expect(service.calculate('ring', 0, 1_000_000)).rejects.toThrow()
  })
})
