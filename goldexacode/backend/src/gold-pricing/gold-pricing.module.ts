import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GoldPrice } from './gold-price.entity'
import { PriceHistory } from './price-history.entity'
import { GoldPricingService } from './gold-pricing.service'
import { GoldPricingController } from './gold-pricing.controller'

@Module({
  imports: [TypeOrmModule.forFeature([GoldPrice, PriceHistory])],
  controllers: [GoldPricingController],
  providers: [GoldPricingService],
  exports: [GoldPricingService],
})
export class GoldPricingModule {}
