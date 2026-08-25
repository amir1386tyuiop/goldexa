import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { EscrowPayment, EscrowPaymentStatus } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import {
  CreateEscrowPaymentDto,
  CreateMarketplaceRatingDto,
  UpdateEscrowStatusDto,
} from './create-escrow.dto'

@Injectable()
export class EscrowService {
  constructor(
    @InjectRepository(EscrowPayment)
    private escrowRepository: Repository<EscrowPayment>,
    @InjectRepository(MarketplaceRating)
    private ratingRepository: Repository<MarketplaceRating>,
  ) {}

  async findPayments(): Promise<EscrowPayment[]> {
    return this.escrowRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findPayment(id: string): Promise<EscrowPayment | null> {
    return this.escrowRepository.findOneBy({ id })
  }

  async createPayment(data: CreateEscrowPaymentDto): Promise<EscrowPayment> {
    if (data.buyerId === data.sellerId) {
      throw new BadRequestException('خریدار و فروشنده نمی‌توانند یک کاربر باشند')
    }

    return this.escrowRepository.save(
      this.escrowRepository.create({
        ...data,
        listingId: data.listingId ?? null,
        auctionId: data.auctionId ?? null,
        orderId: data.orderId ?? null,
        fee: data.fee ?? 0,
        authority: data.authority ?? null,
        paymentUrl: data.paymentUrl ?? null,
        trackingCode: data.trackingCode ?? null,
        // Funds are not considered held until the payment provider confirms them.
        status: EscrowPaymentStatus.INITIATED,
      }),
    )
  }

  async updatePaymentStatus(
    id: string,
    data: UpdateEscrowStatusDto,
  ): Promise<EscrowPayment | null> {
    const payment = await this.escrowRepository.findOneBy({ id })

    if (!payment) {
      throw new NotFoundException('پرداخت امانی یافت نشد')
    }

    const transitions: Record<EscrowPaymentStatus, EscrowPaymentStatus[]> = {
      [EscrowPaymentStatus.INITIATED]: [EscrowPaymentStatus.HELD, EscrowPaymentStatus.CANCELLED],
      [EscrowPaymentStatus.HELD]: [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.DISPUTED],
      [EscrowPaymentStatus.DISPUTED]: [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.CANCELLED],
      [EscrowPaymentStatus.RELEASED]: [],
      [EscrowPaymentStatus.REFUNDED]: [],
      [EscrowPaymentStatus.CANCELLED]: [],
    }
    const nextStatus = data.status as EscrowPaymentStatus
    if (!transitions[payment.status].includes(nextStatus)) {
      throw new BadRequestException(`انتقال وضعیت escrow از ${payment.status} به ${nextStatus} مجاز نیست`)
    }

    payment.status = nextStatus
    payment.trackingCode = data.trackingCode ?? payment.trackingCode
    return this.escrowRepository.save(payment)
  }

  async findRatings(): Promise<MarketplaceRating[]> {
    return this.ratingRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findRatingsByUser(userId: string): Promise<MarketplaceRating[]> {
    return this.ratingRepository.findBy({ revieweeId: userId })
  }

  async createRating(data: CreateMarketplaceRatingDto): Promise<MarketplaceRating> {
    return this.ratingRepository.save(
      this.ratingRepository.create({
        ...data,
        listingId: data.listingId ?? null,
        orderId: data.orderId ?? null,
        rating: Math.max(1, Math.min(5, data.rating)),
        body: data.body ?? null,
      }),
    )
  }
}
