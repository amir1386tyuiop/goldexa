import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
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
  ) {}

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
    return this.snapshotRepository.save(this.snapshotRepository.create(data))
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
}
