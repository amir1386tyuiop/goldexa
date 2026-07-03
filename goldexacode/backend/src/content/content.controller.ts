import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { ContentService } from './content.service'
import { CreateAdCampaignDto, CreateContentPageDto, CreatePromotionDto } from './create-content.dto'

@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Get('pages')
  async findPages() {
    return this.contentService.findPages()
  }

  @Get('pages/:slug')
  async findPage(@Param('slug') slug: string) {
    return this.contentService.findPage(slug)
  }

  @Post('pages')
  async createPage(@Body() body: CreateContentPageDto) {
    return this.contentService.createPage(body)
  }

  @Get('promotions')
  async findPromotions() {
    return this.contentService.findPromotions()
  }

  @Post('promotions')
  async createPromotion(@Body() body: CreatePromotionDto) {
    return this.contentService.createPromotion(body)
  }

  @Get('ads')
  async findAds() {
    return this.contentService.findAds()
  }

  @Post('ads')
  async createAd(@Body() body: CreateAdCampaignDto) {
    return this.contentService.createAd(body)
  }
}
