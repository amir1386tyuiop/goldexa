import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SmartVaultAsset } from './smart-vault-asset.entity'
import { AssetValuationSnapshot } from './asset-valuation-snapshot.entity'
import { PriceAlert } from './price-alert.entity'
import { SmartVaultController } from './smart-vault.controller'
import { SmartVaultService } from './smart-vault.service'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'
import { Order } from '../orders/order.entity'

@Module({
  imports: [TypeOrmModule.forFeature([SmartVaultAsset, AssetValuationSnapshot, PriceAlert, Order]), GoldPricingModule],
  controllers: [SmartVaultController],
  providers: [SmartVaultService],
  exports: [SmartVaultService],
})
export class SmartVaultModule {}
