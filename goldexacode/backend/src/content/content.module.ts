import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentController } from './content.controller'
import { ContentService } from './content.service'
import { AdCampaign } from './ad-campaign.entity'
import { ContentPage } from './content-page.entity'
import { Promotion } from './promotion.entity'

@Module({
  imports: [TypeOrmModule.forFeature([ContentPage, Promotion, AdCampaign])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
