import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { LaborCostRule } from './labor-cost-rule.entity'
import { PricingRule } from './pricing-rule.entity'
import { PricingSpread } from './pricing-spread.entity'
import { TaxRule } from './tax-rule.entity'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'
import { CacheService } from '../common/cache.service'
import {
  CreateLaborCostRuleDto,
  CreatePricingRuleDto,
  CreatePricingSpreadDto,
  CreateTaxRuleDto,
} from './create-pricing.dto'

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(PricingRule)
    private ruleRepository: Repository<PricingRule>,
    @InjectRepository(PricingSpread)
    private spreadRepository: Repository<PricingSpread>,
    @InjectRepository(TaxRule)
    private taxRepository: Repository<TaxRule>,
    @InjectRepository(LaborCostRule)
    private laborRepository: Repository<LaborCostRule>,
    private readonly goldPricing: GoldPricingService,
    private readonly cache: CacheService,
  ) {}

  async findRules(): Promise<PricingRule[]> {
    return this.ruleRepository.findBy({ isActive: true })
  }

  async createRule(data: CreatePricingRuleDto): Promise<PricingRule> {
    return this.ruleRepository.save(
      this.ruleRepository.create({
        ...data,
        description: data.description ?? null,
        laborRate: data.laborRate ?? 0,
        profitRate: data.profitRate ?? 0,
        taxRate: data.taxRate ?? 9,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findSpreads(): Promise<PricingSpread[]> {
    return this.spreadRepository.findBy({ isActive: true })
  }

  async createSpread(data: CreatePricingSpreadDto): Promise<PricingSpread> {
    return this.spreadRepository.save(
      this.spreadRepository.create({
        ...data,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findTaxRules(): Promise<TaxRule[]> {
    return this.taxRepository.findBy({ isActive: true })
  }

  async createTaxRule(data: CreateTaxRuleDto): Promise<TaxRule> {
    return this.taxRepository.save(
      this.taxRepository.create({
        ...data,
        productCategory: data.productCategory ?? null,
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findLaborRules(): Promise<LaborCostRule[]> {
    return this.laborRepository.findBy({ isActive: true })
  }

  async createLaborRule(data: CreateLaborCostRuleDto): Promise<LaborCostRule> {
    return this.laborRepository.save(
      this.laborRepository.create({
        ...data,
        isActive: data.isActive ?? true,
      }),
    )
  }

  /** Live 18k gold price per gram, sourced only from the pricing domain. */
  async getGoldPricePerGram(): Promise<number> {
    const price = await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18)
    return Number(price?.value ?? 0)
  }

  /**
   * Final jewelry price using the Iranian retail formula:
   *   rawGold = weight × dayPricePerGram
   *   labor   = explicit labor rule, otherwise laborRate% of rawGold (اجرت)
   *   profit  = profitRate% of (rawGold + labor)                      (سود)
   *   vat     = taxRate% of (labor + profit)  ← VAT applies ONLY to    (مالیات ارزش افزوده)
   *             labor + profit, NEVER to the gold value itself.
   *   total   = rawGold + labor + profit + vat
   * The gold price is always loaded from GoldPricingService. A caller cannot
   * inject an arbitrary price into the final calculation.
   */
  async calculate(category: string, goldWeight: number) {
    return this.calculateInternal(category, goldWeight, 18)
  }

  private async calculateInternal(category: string, goldWeight: number, karat: number) {
    const weight = Number(goldWeight)
    const purity = Number(karat)
    if (!Number.isFinite(weight) || weight <= 0) {
      throw new Error('وزن طلا نامعتبر است')
    }
    if (!Number.isFinite(purity) || purity <= 0 || purity > 24) {
      throw new Error('عیار طلا نامعتبر است')
    }

    const [rule, spreadRule, taxRule, laborRule] = await Promise.all([
      this.ruleRepository.findOne({ where: { isActive: true }, order: { createdAt: 'DESC' } }),
      this.spreadRepository.findOneBy({ productCategory: category, isActive: true }),
      this.taxRepository.findOneBy({ productCategory: category, isActive: true }),
      this.laborRepository.findOneBy({ productCategory: category, isActive: true }),
    ])

    const pricePerGram = await this.getGoldPricePerGram()
    if (!pricePerGram) {
      throw new Error('قیمت لحظه‌ای طلا در دسترس نیست')
    }

    const rawGold = pricePerGram * weight * (purity / 18)

    // اجرت: قاعده‌ی مطلق (پایه + هر گرم) در اولویت، وگرنه درصدی از ارزش طلا
    const labor = laborRule
      ? Number(laborRule.baseLabor) + Number(laborRule.perGramLabor) * weight
      : rule
        ? (rawGold * Number(rule.laborRate)) / 100
        : 0

    // سود: درصدی از (طلا + اجرت)
    const profit = rule ? ((rawGold + labor) * Number(rule.profitRate)) / 100 : 0

    // مالیات ارزش افزوده: فقط روی اجرت + سود (طبق قانون طلای ایران)
    const taxRate = Number(taxRule?.taxRate ?? rule?.taxRate ?? 9)
    const tax = ((labor + profit) * taxRate) / 100

    // اسپرد خرید/فروش، صرفاً اطلاعاتی (در قیمت خرده‌فروشی لحاظ نمی‌شود)
    const spreadPercent = spreadRule ? Number(spreadRule.spreadPercent) : 0

    const total = rawGold + labor + profit + tax

    return {
      category,
      pricePerGram,
      goldWeight: weight,
      karat: purity,
      rawGold: Math.round(rawGold),
      labor: Math.round(labor),
      profit: Math.round(profit),
      taxRate,
      tax: Math.round(tax),
      spreadPercent,
      total: Math.round(total),
    }
  }

  /** Resolve a catalog product price from the latest live 18k feed. */
  async calculateProductPrice(product: { category: string; weight: number; karat?: number }) {
    const breakdown = await this.calculateInternal(product.category, product.weight, product.karat || 18)
    return breakdown.total
  }

  // --- 5-minute price reservation (قفل/رزرو قیمت) ---
  private static readonly QUOTE_TTL_SECONDS = 5 * 60
  private static readonly QUOTE_NAMESPACE = 'pricing:quote'

  private quoteCacheKey(quoteId: string): string {
    return `${PricingService.QUOTE_NAMESPACE}:${quoteId}`
  }

  /**
   * Locks a calculated price for 5 minutes so the customer can complete payment
   * at the quoted amount even if the live gold price moves in the meantime.
   */
  async createQuote(category: string, goldWeight: number) {
    const breakdown = await this.calculate(category, goldWeight)
    const id = `Q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const expiresAt = Date.now() + PricingService.QUOTE_TTL_SECONDS * 1000
    await this.cache.set(this.quoteCacheKey(id), { breakdown, expiresAt }, PricingService.QUOTE_TTL_SECONDS)
    return {
      quoteId: id,
      ...breakdown,
      expiresAt: new Date(expiresAt).toISOString(),
      ttlSeconds: PricingService.QUOTE_TTL_SECONDS,
    }
  }

  /** Returns a reserved quote if it is still valid, otherwise marks it expired. */
  async getQuote(quoteId: string) {
    const entry = await this.cache.get<{
      breakdown: Awaited<ReturnType<PricingService['calculate']>>
      expiresAt: number
    }>(this.quoteCacheKey(quoteId))
    if (!entry) {
      return { quoteId, valid: false, reason: 'not_found' as const }
    }
    if (Date.now() >= entry.expiresAt) {
      await this.cache.del(this.quoteCacheKey(quoteId))
      return { quoteId, valid: false, reason: 'expired' as const }
    }
    return {
      quoteId,
      valid: true,
      ...entry.breakdown,
      expiresAt: new Date(entry.expiresAt).toISOString(),
      remainingSeconds: Math.max(0, Math.round((entry.expiresAt - Date.now()) / 1000)),
    }
  }

  /**
   * Resolve a quote for a financial operation. Callers must not use the
   * breakdown returned by calculate() when a quote id was supplied: the
   * cached server-issued breakdown is the only authoritative value.
   */
  async requireValidQuote(quoteId: string) {
    const quote = await this.getQuote(quoteId)
    if (!quote.valid) {
      throw new Error(quote.reason === 'expired' ? 'قیمت رزرو شده منقضی شده است' : 'قیمت رزرو شده یافت نشد')
    }
    return quote
  }
}
