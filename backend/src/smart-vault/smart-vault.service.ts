import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SmartVaultAsset } from './smart-vault-asset.entity'
import { AssetValuationSnapshot } from './asset-valuation-snapshot.entity'
import { PriceAlert, PriceAlertTargetType } from './price-alert.entity'
import {
  CreateAssetSnapshotDto,
  CreatePriceAlertDto,
  CreateSmartVaultAssetDto,
} from './create-smart-vault.dto'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { GoldPriceType } from '../gold-pricing/gold-price.entity'
import { Order, OrderStatus } from '../orders/order.entity'
import { NotificationsService } from '../notifications/notifications.service'

@Injectable()
export class SmartVaultService {
  constructor(
    @InjectRepository(SmartVaultAsset)
    private assetRepository: Repository<SmartVaultAsset>,
    @InjectRepository(AssetValuationSnapshot)
    private snapshotRepository: Repository<AssetValuationSnapshot>,
    @InjectRepository(PriceAlert)
    private alertRepository: Repository<PriceAlert>,
    @Optional() private readonly goldPricing?: GoldPricingService,
    @Optional() @InjectRepository(Order) private readonly orderRepository?: Repository<Order>,
    @Optional() private readonly notifications?: NotificationsService,
  ) {}

  /**
   * Refresh the Digital Twin from the latest 18k price. A snapshot is only
   * recorded from a valid price source; stale/fallback zero values must never
   * overwrite the user's valuation.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshValuations(): Promise<{ updatedAssets: number; triggeredAlerts: number }> {
    const goldPrice = this.goldPricing
      ? Number((await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18))?.value || 0)
      : 0
    if (!Number.isFinite(goldPrice) || goldPrice <= 0) return { updatedAssets: 0, triggeredAlerts: 0 }

    const assets = await this.assetRepository.find()
    const portfolioByUser = new Map<string, number>()
    for (const asset of assets) {
      const rawGoldValue = goldPrice * Number(asset.weight) * (Number(asset.karat || 18) / 18)
      const profitLoss = rawGoldValue - Number(asset.purchasePrice)
      const profitLossPercent = Number(asset.purchasePrice) > 0
        ? (profitLoss / Number(asset.purchasePrice)) * 100
        : 0
      await this.assetRepository.save({
        ...asset,
        currentRawGoldValue: rawGoldValue,
        currentValue: rawGoldValue,
        profitLoss,
        profitLossPercent,
      })
      await this.snapshotRepository.save(this.snapshotRepository.create({
        assetId: asset.id,
        userId: asset.userId,
        rawGoldValue,
        totalValue: rawGoldValue,
        profitLoss,
        goldPrice,
      }))
      portfolioByUser.set(asset.userId, (portfolioByUser.get(asset.userId) || 0) + rawGoldValue)
    }

    const alerts = await this.alertRepository.findBy({ isActive: true })
    let triggeredAlerts = 0
    for (const alert of alerts) {
      if (alert.notifiedAt) continue
      const observed = alert.targetType === PriceAlertTargetType.GOLD_PRICE
        ? goldPrice
        : alert.targetType === PriceAlertTargetType.ASSET
          ? Number(assets.find((asset) => asset.id === alert.targetId)?.currentValue || 0)
          : Number(portfolioByUser.get(alert.userId) || 0)
      if (!this.matchesAlert(observed, Number(alert.targetPrice), alert.triggerCondition)) continue

      if (this.notifications) {
        await this.notifications.create({
          userId: alert.userId,
          type: 'price_alert',
          title: 'هشدار قیمت خزانه هوشمند',
          message: `قیمت مشاهده‌شده به ${Math.round(observed).toLocaleString('fa-IR')} تومان رسید.`,
          metadata: { alertId: alert.id, observed, targetPrice: Number(alert.targetPrice), targetType: alert.targetType },
        })
      }
      alert.notifiedAt = new Date()
      await this.alertRepository.save(alert)
      triggeredAlerts += 1
    }
    return { updatedAssets: assets.length, triggeredAlerts }
  }

  private matchesAlert(observed: number, target: number, condition: string): boolean {
    if (!Number.isFinite(observed) || !Number.isFinite(target)) return false
    if (condition === 'less_than_or_equal') return observed <= target
    if (condition === 'equal') return observed === target
    return observed >= target
  }

  async findAssets(userId: string): Promise<SmartVaultAsset[]> {
    return this.assetRepository.findBy({ userId })
  }

  async getSummary(userId: string) {
    const assets = await this.findAssets(userId)
    const liveGoldPrice = this.goldPricing
      ? Number((await this.goldPricing.getPriceByType(GoldPriceType.GOLD_18))?.value || 0)
      : 0
    const summary = assets.reduce(
      (result, asset) => {
        const liveRawGoldValue = liveGoldPrice > 0
          ? liveGoldPrice * Number(asset.weight) * (Number(asset.karat || 18) / 18)
          : Number(asset.currentRawGoldValue ?? asset.currentValue)
        const liveCurrentValue = liveRawGoldValue
        const liveProfitLoss = liveGoldPrice > 0
          ? liveCurrentValue - Number(asset.purchasePrice)
          : Number(asset.profitLoss)
        result.purchaseValue += Number(asset.purchasePrice)
        result.currentValue += liveCurrentValue
        result.goldWeight += Number(asset.weight)
        result.profitLoss += liveProfitLoss
        return result
      },
      { assetCount: 0, purchaseValue: 0, currentValue: 0, goldWeight: 0, profitLoss: 0 },
    )
    return { ...summary, assetCount: assets.length, profitLossPercent: summary.purchaseValue ? (summary.profitLoss / summary.purchaseValue) * 100 : 0 }
  }

  async findAsset(id: string, userId: string, isAdmin = false): Promise<SmartVaultAsset | null> {
    const asset = await this.assetRepository.findOneBy({ id })
    if (asset && !isAdmin && asset.userId !== userId) {
      throw new ForbiddenException('به این دارایی دسترسی ندارید')
    }
    return asset
  }

  async createAsset(data: CreateSmartVaultAssetDto): Promise<SmartVaultAsset> {
    if (!data.userId || !data.orderId || !this.orderRepository) {
      throw new BadRequestException('دارایی صندوقچه فقط از سفارش تحویل‌شده قابل ثبت است')
    }
    const order = await this.orderRepository.findOneBy({ id: data.orderId, userId: data.userId, status: OrderStatus.DELIVERED })
    if (!order) throw new BadRequestException('فقط سفارش تحویل‌شده‌ی متعلق به همین کاربر قابل افزودن به صندوقچه است')
    const items = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : []
    const matchesOrderItem = items.some((item) =>
      (!data.productId || String(item.productId ?? '') === data.productId) &&
      Math.abs(Number(item.weight ?? 0) - Number(data.weight)) <= 0.01 &&
      Number(item.karat ?? 0) === Number(data.karat ?? 18),
    )
    if (!matchesOrderItem) throw new BadRequestException('مشخصات دارایی با اقلام سفارش تحویل‌شده مطابقت ندارد')

    const asset = this.assetRepository.create({
      ...data,
      currentRawGoldValue: data.purchasePrice,
      currentValue: data.purchasePrice,
      profitLoss: 0,
      profitLossPercent: 0,
      images: data.images ?? [],
      metadata: data.metadata ?? null,
    })

    return this.assetRepository.save(asset)
  }

  async findSnapshots(assetId: string, userId: string, isAdmin = false): Promise<AssetValuationSnapshot[]> {
    const asset = await this.assetRepository.findOneBy({ id: assetId })
    if (asset && !isAdmin && asset.userId !== userId) {
      throw new ForbiddenException('به این دارایی دسترسی ندارید')
    }
    return this.snapshotRepository.findBy({ assetId })
  }

  async createSnapshot(data: CreateAssetSnapshotDto): Promise<AssetValuationSnapshot> {
    const asset = await this.assetRepository.findOneBy({ id: data.assetId })
    if (!asset) throw new NotFoundException('دارایی یافت نشد')
    if (asset.userId !== data.userId) throw new ForbiddenException('به این دارایی دسترسی ندارید')
    const snapshot = await this.snapshotRepository.save(this.snapshotRepository.create(data))
    await this.assetRepository.save({
      ...asset,
      currentRawGoldValue: data.rawGoldValue,
      currentValue: data.totalValue,
      profitLoss: data.profitLoss,
      profitLossPercent: Number(asset.purchasePrice) > 0 ? (data.profitLoss / Number(asset.purchasePrice)) * 100 : 0,
    })
    return snapshot
  }

  async findAlerts(userId: string): Promise<PriceAlert[]> {
    return this.alertRepository.findBy({ userId })
  }

  async createAlert(data: CreatePriceAlertDto): Promise<PriceAlert> {
    const alert = this.alertRepository.create({
      ...data,
      targetId: data.targetId ?? null,
      targetType: data.targetType as PriceAlertTargetType,
      triggerCondition: data.triggerCondition ?? 'greater_than_or_equal',
      isActive: true,
      notifiedAt: null,
    } as PriceAlert)

    return this.alertRepository.save(alert)
  }

  async disableAlert(id: string, userId: string, isAdmin = false): Promise<PriceAlert | null> {
    const alert = await this.alertRepository.findOneBy({ id })

    if (!alert) {
      throw new NotFoundException('هشدار قیمت یافت نشد')
    }
    if (!isAdmin && alert.userId !== userId) {
      throw new ForbiddenException('به این هشدار دسترسی ندارید')
    }

    alert.isActive = false
    return this.alertRepository.save(alert)
  }

  async resetAlert(id: string, userId: string, isAdmin = false): Promise<PriceAlert | null> {
    const alert = await this.alertRepository.findOneBy({ id })
    if (!alert) throw new NotFoundException('هشدار قیمت یافت نشد')
    if (!isAdmin && alert.userId !== userId) {
      throw new ForbiddenException('به این هشدار دسترسی ندارید')
    }

    alert.isActive = true
    alert.notifiedAt = null
    return this.alertRepository.save(alert)
  }
}
