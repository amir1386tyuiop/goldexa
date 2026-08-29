import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
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

@Injectable()
export class SmartVaultService {
  constructor(
    @InjectRepository(SmartVaultAsset)
    private assetRepository: Repository<SmartVaultAsset>,
    @InjectRepository(AssetValuationSnapshot)
    private snapshotRepository: Repository<AssetValuationSnapshot>,
    @InjectRepository(PriceAlert)
    private alertRepository: Repository<PriceAlert>,
  ) {}

  async findAssets(userId: string): Promise<SmartVaultAsset[]> {
    return this.assetRepository.findBy({ userId })
  }

  async findAsset(id: string, userId: string, isAdmin = false): Promise<SmartVaultAsset | null> {
    const asset = await this.assetRepository.findOneBy({ id })
    if (asset && !isAdmin && asset.userId !== userId) {
      throw new ForbiddenException('به این دارایی دسترسی ندارید')
    }
    return asset
  }

  async createAsset(data: CreateSmartVaultAssetDto): Promise<SmartVaultAsset> {
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
