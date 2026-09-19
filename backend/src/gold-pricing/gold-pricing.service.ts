import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Cron, CronExpression } from '@nestjs/schedule'
import axios from 'axios'
import { GoldPrice, GoldPriceType } from './gold-price.entity'
import { PriceHistory } from './price-history.entity'
import { CacheService } from '../common/cache.service'
import { AuditLogger } from '../common/audit-logger.service'
import { User, UserRole } from '../users/user.entity'
import { NotificationsService } from '../notifications/notifications.service'

interface GoldPriceInput {
  type: GoldPriceType
  value: number
  change: number
  changePercent: number
  isValid: boolean
}

const CACHE_TTL_MS = 15_000
// PRD 5.1 AC: reject a fetched price that differs from the last valid price by
// more than 2% (implausible jump / bad source), then retry on the next tick.
const MAX_FLUCTUATION_PERCENT = 2

@Injectable()
export class GoldPricingService implements OnModuleInit {
  private readonly logger = new Logger(GoldPricingService.name)
  private lastFetchAt: Date | null = null
  private sourceHealthy = true

  constructor(
    @InjectRepository(GoldPrice)
    private goldPriceRepository: Repository<GoldPrice>,
    @InjectRepository(PriceHistory)
    private priceHistoryRepository: Repository<PriceHistory>,
    private readonly configService: ConfigService,
    private readonly cache: CacheService,
    private readonly audit: AuditLogger,
    @Optional() @InjectRepository(User)
    private readonly userRepository?: Repository<User>,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /** Raise an admin alert (audit + log) the first time the source goes down. */
  private async markSourceDown(reason: string): Promise<void> {
    if (this.sourceHealthy) {
      this.sourceHealthy = false
      this.logger.warn(`ADMIN ALERT: gold price source unavailable — serving last valid price. ${reason}`)
      await this.audit.record({
        action: 'PRICE_SOURCE_DOWN',
        entityType: 'gold_price',
        metadata: { reason, at: new Date().toISOString() },
      })
      await this.notifyAdministrators(reason)
    }
  }

  private async notifyAdministrators(reason: string): Promise<void> {
    if (!this.userRepository || !this.notifications) return
    try {
      const administrators = await this.userRepository.find({ where: { role: UserRole.ADMIN } })
      await Promise.all(administrators.map((admin) => this.notifications!.create({
        userId: admin.id,
        type: 'gold_price_source_down',
        title: 'منبع قیمت طلا قطع شد',
        message: 'منبع قیمت لحظه‌ای طلا در دسترس نیست؛ آخرین قیمت معتبر نگه داشته شد.',
        metadata: { reason },
      })))
    } catch (error) {
      this.logger.warn(`Could not notify administrators about price source: ${(error as Error).message}`)
    }
  }

  private async markSourceHealthy(): Promise<void> {
    if (!this.sourceHealthy) {
      this.sourceHealthy = true
      await this.audit.record({ action: 'PRICE_SOURCE_RECOVERED', entityType: 'gold_price' })
    }
  }

  private cacheKey(type: GoldPriceType): string {
    return `gold_price:${type}`
  }

  async onModuleInit() {
    await this.fetchGoldPrices()
  }

  async getLatestPrices(): Promise<GoldPrice[]> {
    return this.goldPriceRepository.find({
      where: { isValid: true },
      order: { createdAt: 'DESC' },
      take: 4,
    })
  }

  /** Latest valid price for a type, served from the cache (Redis or memory). */
  async getPriceByType(type: GoldPriceType): Promise<GoldPrice | null> {
    const cached = await this.cache.get<GoldPrice>(this.cacheKey(type))
    if (cached) {
      return cached
    }
    const price = await this.getPriceByTypeFromDb(type)
    if (price) {
      await this.cache.set(this.cacheKey(type), price, CACHE_TTL_MS / 1000)
    }
    return price
  }

  /** Recent price history for charting trends. */
  async getHistory(type: GoldPriceType, limit = 50): Promise<PriceHistory[]> {
    return this.priceHistoryRepository.find({
      where: { type },
      order: { recordedAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 500),
    })
  }

  /** Health/status of the price feed for the update timer in the UI. */
  getFeedStatus() {
    return {
      source: this.configService.get<string>('GOLD_PRICE_SOURCE') ?? 'mock',
      lastFetchAt: this.lastFetchAt,
      refreshIntervalSeconds: 60,
      cacheTtlSeconds: CACHE_TTL_MS / 1000,
      cacheDriver: this.cache.driver,
    }
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async fetchGoldPrices(): Promise<void> {
    try {
      const prices = await this.fetchFromExternalAPI()
      await this.savePrices(prices)
      this.lastFetchAt = new Date()
    } catch (error) {
      this.logger.error(`Error fetching gold prices: ${(error as Error).message}`)
    }
  }

  private async fetchFromExternalAPI(): Promise<GoldPrice[]> {
    const source = (this.configService.get<string>('GOLD_PRICE_SOURCE') ?? '').toLowerCase()
    const apiUrl = this.configService.get<string>('GOLD_PRICE_API_URL')
    const apiKey = this.configService.get<string>('GOLD_PRICE_API_KEY')

    // Preferred MVP source: tgju.org
    if (source === 'tgju' || (apiUrl && apiUrl.includes('tgju'))) {
      try {
        const prices = await this.fetchFromTgju()
        await this.markSourceHealthy()
        return prices
      } catch (error) {
        await this.markSourceDown(`tgju: ${(error as Error).message}`)
        return this.getMockPrices()
      }
    }

    if (!apiUrl) {
      // No external source configured — mock feed is the intended source here.
      return this.getMockPrices()
    }

    try {
      const { data } = await axios.get(apiUrl, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        timeout: 8000,
      })

      if (Array.isArray(data)) {
        const mappedPrices: GoldPriceInput[] = data.map((item: Record<string, unknown>) => ({
          type: this.mapGoldPriceType(String(item.type || item.name || 'gold18')),
          value: Number(item.value || item.price || 0),
          change: Number(item.change || 0),
          changePercent: Number(item.changePercent || item.change_percent || 0),
          isValid: item.isValid !== false && item.is_valid !== false,
        }))
        await this.markSourceHealthy()
        return this.normalizePrices(mappedPrices)
      }

      await this.markSourceDown('API returned an unexpected payload shape')
      return this.getMockPrices()
    } catch (error) {
      await this.markSourceDown(`API: ${(error as Error).message}`)
      return this.getMockPrices()
    }
  }

  /**
   * Adapter for tgju.org's public market feed (call.tgju.org/ajax.json).
   * Keys: geram18 (18k/gram), mesghal (مظنه), ons (انس), sekee (سکه).
   * Values arrive as comma-formatted strings; `p`=price, `d`=change, `dp`=%.
   * GOLD_PRICE_TGJU_DIVISOR lets you convert ریال→تومان (set to 10) if needed.
   */
  private async fetchFromTgju(): Promise<GoldPrice[]> {
    const url = this.configService.get<string>('GOLD_PRICE_API_URL') || 'https://call.tgju.org/ajax.json'
    const localCurrencyDivisor = Number(this.configService.get<string>('GOLD_PRICE_TGJU_DIVISOR')) || 10
    const { data } = await axios.get(url, { timeout: 8000 })
    const current = (data?.current ?? data) as Record<string, { p?: string; d?: string; dp?: string }>

    const toNum = (raw?: string) => Number(String(raw ?? '0').replace(/[^0-9.-]/g, '')) || 0
    const map: { key: string; type: GoldPriceType }[] = [
      { key: 'geram18', type: GoldPriceType.GOLD_18 },
      { key: 'mesghal', type: GoldPriceType.MIZANEH },
      { key: 'ons', type: GoldPriceType.OUNCE },
      { key: 'sekee', type: GoldPriceType.COIN },
    ]

    const prices: GoldPriceInput[] = []
    for (const { key, type } of map) {
      const node = current?.[key]
      if (!node) continue
      // TGJU reports Iranian market values in ریال, while the global ounce is USD.
      const divisor = type === GoldPriceType.OUNCE ? 1 : localCurrencyDivisor
      prices.push({
        type,
        value: toNum(node.p) / divisor,
        change: toNum(node.d) / divisor,
        changePercent: toNum(node.dp),
        isValid: true,
      })
    }

    if (!prices.length) {
      throw new Error('tgju payload did not contain expected keys')
    }
    return this.normalizePrices(prices)
  }

  private getMockPrices(): GoldPrice[] {
    if (this.configService.get<string>('NODE_ENV') === 'production') {
      throw new Error('منبع قیمت طلا در محیط production در دسترس نیست')
    }
    const minute = Math.floor(Date.now() / 60000)
    const delta = ((minute % 9) - 4) * 1000
    const prices: GoldPriceInput[] = [
      { type: GoldPriceType.MIZANEH, value: 142500000 + delta, change: 1250000 + delta, changePercent: 0.88, isValid: true },
      { type: GoldPriceType.COIN, value: 41500000 - Math.floor(delta / 4), change: -350000 - Math.floor(delta / 4), changePercent: -0.84, isValid: true },
      { type: GoldPriceType.OUNCE, value: 2035 + Math.floor(delta / 1000), change: 12, changePercent: 0.59, isValid: true },
      { type: GoldPriceType.GOLD_18, value: 3560000 + Math.floor(delta / 4), change: 28000 + Math.floor(delta / 4), changePercent: 0.79, isValid: true },
    ]
    return this.normalizePrices(prices)
  }

  private normalizePrices(prices: GoldPriceInput[]): GoldPrice[] {
    return prices.map((price) => this.goldPriceRepository.create(price))
  }

  private mapGoldPriceType(value: string): GoldPriceType {
    const normalized = value.toLowerCase()
    if (normalized.includes('mizaneh') || normalized.includes('mazaneh') || normalized.includes('mesghal')) return GoldPriceType.MIZANEH
    if (normalized.includes('coin') || normalized.includes('sekee') || normalized.includes('sekkeh')) return GoldPriceType.COIN
    if (normalized.includes('ounce') || normalized.includes('ons')) return GoldPriceType.OUNCE
    return GoldPriceType.GOLD_18
  }

  private async savePrices(prices: GoldPrice[]): Promise<void> {
    const source = (this.configService.get<string>('GOLD_PRICE_SOURCE') ?? 'mock').toLowerCase()

    for (const price of prices) {
      const newValue = Number(price.value)
      if (!Number.isFinite(newValue) || newValue <= 0) {
        continue
      }

      const existing = await this.getPriceByTypeFromDb(price.type)

      // Fluctuation guard: reject an implausible jump from a flaky source.
      if (existing) {
        const last = Number(existing.value)
        if (last > 0 && Math.abs(newValue - last) / last > MAX_FLUCTUATION_PERCENT / 100) {
          this.logger.warn(
            `Rejected ${price.type} price ${newValue} (jump from ${last} exceeds ${MAX_FLUCTUATION_PERCENT}%)`,
          )
          await this.audit.record({
            action: 'PRICE_FLUCTUATION_REJECTED',
            entityType: 'gold_price',
            metadata: { type: price.type, rejected: newValue, last, thresholdPercent: MAX_FLUCTUATION_PERCENT },
          })
          continue
        }
      }

      if (existing) {
        const changed = Number(existing.value) !== newValue
        existing.value = newValue
        existing.change = price.change
        existing.changePercent = price.changePercent
        existing.isValid = price.isValid
        await this.goldPriceRepository.save(existing)
        if (changed) {
          await this.appendHistory(price, source)
        }
      } else {
        await this.goldPriceRepository.save(price)
        await this.appendHistory(price, source)
      }

      // Invalidate cache so consumers get the fresh price.
      await this.cache.del(this.cacheKey(price.type))
    }
  }

  private async getPriceByTypeFromDb(type: GoldPriceType): Promise<GoldPrice | null> {
    return this.goldPriceRepository.findOne({
      where: { type, isValid: true },
      order: { createdAt: 'DESC' },
    })
  }

  private async appendHistory(price: GoldPrice, source: string): Promise<void> {
    await this.priceHistoryRepository.save(
      this.priceHistoryRepository.create({
        type: price.type,
        value: Number(price.value),
        change: Number(price.change),
        changePercent: Number(price.changePercent),
        source,
      }),
    )
  }
}
