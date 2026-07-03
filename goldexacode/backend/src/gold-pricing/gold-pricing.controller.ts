import { Controller, Get, Param, Query } from '@nestjs/common'
import { GoldPricingService } from './gold-pricing.service'
import { GoldPriceType } from './gold-price.entity'

@Controller('gold-pricing')
export class GoldPricingController {
  constructor(private readonly goldPricingService: GoldPricingService) {}

  @Get()
  async getLatestPrices() {
    return this.goldPricingService.getLatestPrices()
  }

  @Get('status')
  async getStatus() {
    return this.goldPricingService.getFeedStatus()
  }

  @Get('history/:type')
  async getHistory(@Param('type') type: GoldPriceType, @Query('limit') limit?: string) {
    return this.goldPricingService.getHistory(type, limit ? Number(limit) : 50)
  }

  @Get(':type')
  async getPriceByType(@Param('type') type: GoldPriceType) {
    return this.goldPricingService.getPriceByType(type)
  }
}
