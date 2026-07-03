import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdCampaign } from './ad-campaign.entity'
import { ContentPage } from './content-page.entity'
import { Promotion } from './promotion.entity'
import { CreateAdCampaignDto, CreateContentPageDto, CreatePromotionDto } from './create-content.dto'

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(ContentPage)
    private pageRepository: Repository<ContentPage>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(AdCampaign)
    private adRepository: Repository<AdCampaign>,
  ) {}

  async findPages(): Promise<ContentPage[]> {
    return this.pageRepository.findBy({ isPublished: true })
  }

  async findPage(slug: string): Promise<ContentPage | null> {
    return this.pageRepository.findOneBy({ slug, isPublished: true })
  }

  async createPage(data: CreateContentPageDto): Promise<ContentPage> {
    return this.pageRepository.save(
      this.pageRepository.create({
        ...data,
        cover_url: data.coverUrl ?? null,
        isPublished: data.isPublished ?? true,
      }),
    )
  }

  async findPromotions(): Promise<Promotion[]> {
    return this.promotionRepository.findBy({ isActive: true })
  }

  async createPromotion(data: CreatePromotionDto): Promise<Promotion> {
    return this.promotionRepository.save(
      this.promotionRepository.create({
        ...data,
        description: data.description ?? null,
        discountValue: data.discountValue ?? 0,
        discountType: data.discountType ?? 'percent',
        isActive: data.isActive ?? true,
      }),
    )
  }

  async findAds(): Promise<AdCampaign[]> {
    return this.adRepository.findBy({ isActive: true })
  }

  async createAd(data: CreateAdCampaignDto): Promise<AdCampaign> {
    return this.adRepository.save(
      this.adRepository.create({
        ...data,
        description: data.description ?? null,
        budget: data.budget ?? 0,
        isActive: data.isActive ?? true,
      }),
    )
  }
}
