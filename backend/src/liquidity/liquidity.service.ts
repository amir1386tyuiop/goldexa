import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { BuyerRequest, BuyerRequestStatus } from './buyer-request.entity'
import { LiquidityRequest, LiquidityRequestStatus } from './liquidity-request.entity'
import { SellRecommendation } from './sell-recommendation.entity'
import { CreateBuyerRequestDto, CreateLiquidityRequestDto, CreateSellRecommendationDto } from './create-liquidity.dto'

@Injectable()
export class LiquidityService {
  constructor(
    @InjectRepository(LiquidityRequest)
    private requestRepository: Repository<LiquidityRequest>,
    @InjectRepository(SellRecommendation)
    private recommendationRepository: Repository<SellRecommendation>,
    @InjectRepository(BuyerRequest)
    private buyerRequestRepository: Repository<BuyerRequest>,
  ) {}

  async findRequests(userId: string): Promise<LiquidityRequest[]> {
    return this.requestRepository.findBy({ userId })
  }

  async createRequest(data: CreateLiquidityRequestDto): Promise<LiquidityRequest> {
    return this.requestRepository.save(
      this.requestRepository.create({
        ...data,
        assetId: data.assetId ?? null,
        listingId: data.listingId ?? null,
        notes: data.notes ?? null,
        status: LiquidityRequestStatus.DRAFT,
      }),
    )
  }

  async updateRequestStatus(id: string, status: string): Promise<LiquidityRequest | null> {
    const request = await this.requestRepository.findOneBy({ id })

    if (!request) {
      throw new NotFoundException('درخواست نقدشوندگی یافت نشد')
    }

    request.status = status as LiquidityRequestStatus
    return this.requestRepository.save(request)
  }

  async findRecommendations(userId: string): Promise<SellRecommendation[]> {
    return this.recommendationRepository.findBy({ userId })
  }

  async createRecommendation(data: CreateSellRecommendationDto): Promise<SellRecommendation> {
    return this.recommendationRepository.save(
      this.recommendationRepository.create({
        ...data,
        assetId: data.assetId ?? null,
      }),
    )
  }

  async findBuyerRequests(): Promise<BuyerRequest[]> {
    return this.buyerRequestRepository.findBy({ status: BuyerRequestStatus.OPEN })
  }

  async createBuyerRequest(data: CreateBuyerRequestDto): Promise<BuyerRequest> {
    return this.buyerRequestRepository.save(
      this.buyerRequestRepository.create({
        ...data,
        category: data.category ?? null,
        minWeight: data.minWeight ?? 0,
        maxWeight: data.maxWeight ?? 0,
        status: BuyerRequestStatus.OPEN,
      }),
    )
  }
}
