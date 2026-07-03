import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PricingController } from './pricing.controller'
import { PricingService } from './pricing.service'
import { PricingRule } from './pricing-rule.entity'
import { PricingSpread } from './pricing-spread.entity'
import { TaxRule } from './tax-rule.entity'
import { LaborCostRule } from './labor-cost-rule.entity'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([PricingRule, PricingSpread, TaxRule, LaborCostRule]),
    GoldPricingModule,
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}
