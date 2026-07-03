import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common'
import { PricingService } from './pricing.service'
import {
  CreateLaborCostRuleDto,
  CreatePricingRuleDto,
  CreatePricingSpreadDto,
  CreateTaxRuleDto,
} from './create-pricing.dto'

@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // API spec §5: current gold price per gram.
  @Get('current')
  async current() {
    const pricePerGram = await this.pricingService.getGoldPricePerGram()
    return { goldType: 'gold18', pricePerGram, currency: 'IRR' }
  }

  @Get('rules')
  async findRules() {
    return this.pricingService.findRules()
  }

  @Post('rules')
  async createRule(@Body() body: CreatePricingRuleDto) {
    return this.pricingService.createRule(body)
  }

  @Get('spreads')
  async findSpreads() {
    return this.pricingService.findSpreads()
  }

  @Post('spreads')
  async createSpread(@Body() body: CreatePricingSpreadDto) {
    return this.pricingService.createSpread(body)
  }

  @Get('tax')
  async findTaxRules() {
    return this.pricingService.findTaxRules()
  }

  @Post('tax')
  async createTaxRule(@Body() body: CreateTaxRuleDto) {
    return this.pricingService.createTaxRule(body)
  }

  @Get('labor')
  async findLaborRules() {
    return this.pricingService.findLaborRules()
  }

  @Post('labor')
  async createLaborRule(@Body() body: CreateLaborCostRuleDto) {
    return this.pricingService.createLaborRule(body)
  }

  @Get('calculate/:category')
  async calculateGet(
    @Param('category') category: string,
    @Query('goldWeight') goldWeight?: string,
    @Query('rawGoldPrice') rawGoldPrice?: string,
  ) {
    return this.pricingService.calculate(
      category,
      Number(goldWeight) || 1,
      rawGoldPrice ? Number(rawGoldPrice) : undefined,
    )
  }

  @Post('calculate/:category')
  async calculate(
    @Param('category') category: string,
    @Body() body: { goldWeight: number; rawGoldPrice?: number },
  ) {
    return this.pricingService.calculate(category, body.goldWeight, body.rawGoldPrice)
  }

  // 5-minute price reservation
  @Post('quote/:category')
  async createQuote(@Param('category') category: string, @Body() body: { goldWeight: number }) {
    return this.pricingService.createQuote(category, body.goldWeight)
  }

  @Get('quote/:id')
  async getQuote(@Param('id') id: string) {
    return this.pricingService.getQuote(id)
  }
}
