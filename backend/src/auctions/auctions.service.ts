import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Not, Repository } from 'typeorm'
import {
  Auction,
  AuctionPaymentStatus,
  AuctionQualityStatus,
  AuctionStatus,
  BidIncrementType,
} from './auction.entity'
import { AuctionBid } from './auction-bid.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import {
  CreateAuctionDto,
  PlaceBidDto,
  UpdateAuctionReviewDto,
} from './create-auction.dto'

@Injectable()
export class AuctionsService {
  constructor(
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(AuctionBid)
    private auctionBidRepository: Repository<AuctionBid>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<Auction[]> {
    await this.syncStatuses()

    return this.auctionRepository.find({
      order: {
        endsAt: 'ASC',
        createdAt: 'DESC',
      },
    })
  }

  async findActive(): Promise<Auction[]> {
    await this.syncStatuses()

    return this.auctionRepository
      .createQueryBuilder('auction')
      .where('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED],
      })
      .getMany()
  }

  async findOne(id: string): Promise<Auction | null> {
    await this.syncStatuses()

    return this.auctionRepository.findOneBy({ id })
  }

  async findByUser(userId: string): Promise<Auction[]> {
    if (!userId) {
      throw new BadRequestException('شناسه کاربر الزامی است')
    }

    await this.syncStatuses()

    return this.auctionRepository
      .createQueryBuilder('auction')
      .leftJoinAndSelect('auction.product', 'product')
      .where('auction.seller_id = :userId OR auction.winning_bidder_id = :userId', { userId })
      .orderBy('auction.ends_at', 'ASC')
      .getMany()
  }

  async findBids(auctionId: string): Promise<AuctionBid[]> {
    return this.auctionBidRepository.find({
      where: { auctionId },
      order: { createdAt: 'ASC' },
    })
  }

  async createAuction(data: CreateAuctionDto, sellerId: string): Promise<Auction> {
    if (!sellerId) {
      throw new BadRequestException('فروشنده معتبر نیست')
    }

    if (data.productId) {
      const product = await this.productRepository.findOneBy({ id: data.productId })

      if (!product) {
        throw new NotFoundException('محصول مزایده یافت نشد')
      }

      if (product.stock < 1) {
        throw new BadRequestException('موجودی محصول برای مزایده کافی نیست')
      }
    }

    const seller = await this.userRepository.findOneBy({ id: sellerId })

    if (!seller) {
      throw new NotFoundException('فروشنده مزایده یافت نشد')
    }

    const startsAt = new Date(data.startsAt)
    const endsAt = new Date(data.endsAt)

    if (endsAt <= startsAt) {
      throw new BadRequestException('زمان پایان مزایده باید بعد از زمان شروع باشد')
    }

    const durationDays = data.durationDays ?? this.getDurationDays(startsAt, endsAt)
    const minimumBidIncrement =
      data.bidIncrementType === BidIncrementType.PERCENT
        ? (data.startingPrice * (data.bidIncrementPercent ?? 0)) / 100
        : data.minimumBidIncrement

    const auction = this.auctionRepository.create({
      startsAt,
      endsAt,
      productId: data.productId ?? null,
      sellerId,
      sellerName: seller.name,
      durationDays,
      currentPrice: data.startingPrice,
      reservePrice: data.reservePrice ?? null,
      bidIncrementType: data.bidIncrementType ?? BidIncrementType.AMOUNT,
      minimumBidIncrement,
      bidIncrementPercent: data.bidIncrementPercent ?? 0,
      autoExtendMinutes: data.autoExtendMinutes ?? 2,
      autoExtendSeconds: data.autoExtendSeconds ?? 300,
      paymentWindowMinutes: data.paymentWindowMinutes ?? 1440,
      paymentDeadlineAt: this.addMinutes(endsAt, data.paymentWindowMinutes ?? 1440),
      commissionRate: data.commissionRate ?? 0,
      commissionAmount: 0,
      shippingMethod: data.shippingMethod,
      shippingCost: data.shippingCost ?? 0,
      qualityStatus: AuctionQualityStatus.NOT_SENT,
      expertName: null,
      expertNotes: null,
      // New auctions must pass review before they can accept bids.
      status: AuctionStatus.PENDING_REVIEW,
      bidCount: 0,
      paymentStatus: AuctionPaymentStatus.UNPAID,
      reserveMet: false,
    })

    return this.auctionRepository.save(auction)
  }

  async placeBid(id: string, data: PlaceBidDto, bidderId: string): Promise<Auction> {
    await this.syncStatuses()

    const auction = await this.auctionRepository.findOneBy({ id })

    if (!auction) {
      throw new NotFoundException('مزایده یافت نشد')
    }

    if (auction.status !== AuctionStatus.ACTIVE && auction.status !== AuctionStatus.EXTENDED) {
      throw new BadRequestException('مزایده در حال حاضر برای ثبت پیشنهاد فعال نیست')
    }

    const bidder = await this.userRepository.findOneBy({ id: bidderId })

    if (!bidder) {
      throw new NotFoundException('کاربر پیشنهاددهنده یافت نشد')
    }

    const minimumAmount = this.getMinimumBidAmount(auction)

    if (!Number.isFinite(data.amount) || data.amount < minimumAmount) {
      throw new BadRequestException(`حداقل مبلغ پیشنهاد ${minimumAmount.toLocaleString('fa-IR')} تومان است`)
    }

    if (auction.sellerId === bidderId) {
      throw new BadRequestException('فروشنده نمی‌تواند روی مزایده خودش پیشنهاد ثبت کند')
    }

    await this.auctionBidRepository.update(
      { auctionId: id, isWinning: true },
      { isWinning: false },
    )

    const now = new Date()
    const shouldExtend =
      this.minutesUntil(auction.endsAt, now) <= auction.autoExtendMinutes &&
      auction.autoExtendSeconds > 0

    if (shouldExtend) {
      auction.endsAt = new Date(auction.endsAt.getTime() + auction.autoExtendSeconds * 1000)
      auction.paymentDeadlineAt = this.addMinutes(auction.endsAt, auction.paymentWindowMinutes)
      auction.status = AuctionStatus.EXTENDED
    }

    const bid = this.auctionBidRepository.create({
      auctionId: id,
      bidderId,
      bidderName: bidder.name,
      amount: data.amount,
      isWinning: true,
    })

    await this.auctionBidRepository.save(bid)

    auction.currentPrice = data.amount
    auction.bidCount += 1
    if (auction.winningBidderId && auction.winningBidderId !== bidderId) {
      auction.secondWinnerId = auction.winningBidderId
      auction.secondWinnerName = auction.winningBidderName
      auction.secondWinnerAmount = auction.winningAmount
    }
    auction.winningBidderId = bidderId
    auction.winningBidderName = bidder.name
    auction.winningAmount = data.amount
    auction.reserveMet = !auction.reservePrice || data.amount >= auction.reservePrice

    return this.auctionRepository.save(auction)
  }

  async settleAuction(id: string): Promise<Auction> {
    await this.syncStatuses()

    const auction = await this.auctionRepository.findOneBy({ id })

    if (!auction) {
      throw new NotFoundException('مزایده یافت نشد')
    }

    if (![AuctionStatus.ENDED, AuctionStatus.AWAITING_PAYMENT].includes(auction.status)) {
      throw new BadRequestException('برای تسویه، مزایده باید به پایان رسیده باشد')
    }

    const amount = Number(auction.winningAmount ?? 0)
    if (amount <= 0 || !auction.winningBidderId || !auction.reserveMet) {
      auction.paymentStatus = AuctionPaymentStatus.REFUNDED
      auction.status = AuctionStatus.FAILED
      auction.winningBidderId = null
      auction.winningBidderName = null
      auction.winningAmount = null
      return this.auctionRepository.save(auction)
    }

    auction.paymentStatus =
      AuctionPaymentStatus.SETTLED
    auction.commissionAmount = (amount * Number(auction.commissionRate ?? 0)) / 100
    auction.status = AuctionStatus.COMPLETED

    return this.auctionRepository.save(auction)
  }

  async updateReview(id: string, data: UpdateAuctionReviewDto): Promise<Auction | null> {
    const auction = await this.auctionRepository.findOneBy({ id })
    if (!auction) {
      throw new NotFoundException('مزایده یافت نشد')
    }
    if (![AuctionStatus.PENDING_REVIEW, AuctionStatus.SCHEDULED].includes(auction.status)) {
      throw new BadRequestException('وضعیت فعلی مزایده قابل بازبینی نیست')
    }

    await this.auctionRepository.update(id, {
      qualityStatus: data.qualityStatus,
      expertName: data.expertName ?? null,
      expertNotes: data.expertNotes ?? null,
      qualityBadge: data.qualityStatus === 'approved',
      status: data.qualityStatus === 'approved' ? AuctionStatus.SCHEDULED : AuctionStatus.CANCELLED,
    })

    return this.auctionRepository.findOneBy({ id })
  }

  async updateStatus(id: string, status: AuctionStatus): Promise<Auction | null> {
    const auction = await this.auctionRepository.findOneBy({ id })
    if (!auction) {
      throw new NotFoundException('مزایده یافت نشد')
    }
    if (!this.isAllowedTransition(auction.status, status)) {
      throw new BadRequestException(`تغییر وضعیت از ${auction.status} به ${status} مجاز نیست`)
    }
    await this.auctionRepository.update(id, { status })
    return this.auctionRepository.findOneBy({ id })
  }

  async cancelAuction(id: string): Promise<Auction | null> {
    const auction = await this.auctionRepository.findOneBy({ id })
    if (!auction) {
      throw new NotFoundException('مزایده یافت نشد')
    }
    if ([AuctionStatus.COMPLETED, AuctionStatus.CANCELLED].includes(auction.status)) {
      throw new BadRequestException('مزایده در وضعیت قابل لغو نیست')
    }
    await this.auctionRepository.update(id, { status: AuctionStatus.CANCELLED })
    return this.auctionRepository.findOneBy({ id })
  }

  private isAllowedTransition(from: AuctionStatus, to: AuctionStatus): boolean {
    const transitions: Record<AuctionStatus, AuctionStatus[]> = {
      [AuctionStatus.PENDING_REVIEW]: [AuctionStatus.SCHEDULED, AuctionStatus.CANCELLED],
      [AuctionStatus.SCHEDULED]: [AuctionStatus.ACTIVE, AuctionStatus.CANCELLED],
      [AuctionStatus.ACTIVE]: [AuctionStatus.EXTENDED, AuctionStatus.ENDED, AuctionStatus.CANCELLED],
      [AuctionStatus.EXTENDED]: [AuctionStatus.ENDED, AuctionStatus.CANCELLED],
      [AuctionStatus.ENDED]: [AuctionStatus.AWAITING_PAYMENT, AuctionStatus.FAILED],
      [AuctionStatus.AWAITING_PAYMENT]: [AuctionStatus.COMPLETED, AuctionStatus.FAILED],
      [AuctionStatus.COMPLETED]: [],
      [AuctionStatus.CANCELLED]: [],
      [AuctionStatus.FAILED]: [],
    }
    return from === to || transitions[from].includes(to)
  }

  private async syncStatuses() {
    const now = new Date()

    await this.auctionRepository
      .createQueryBuilder()
      .update(Auction)
      .set({ status: AuctionStatus.ACTIVE })
      .where('status = :scheduled', { scheduled: AuctionStatus.SCHEDULED })
      .andWhere('starts_at <= :now', { now })
      .execute()

    await this.auctionRepository
      .createQueryBuilder()
      .update(Auction)
      .set({ status: AuctionStatus.ENDED })
      .where('status IN (:...activeStatuses)', {
        activeStatuses: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED],
      })
      .andWhere('ends_at <= :now', { now })
      .execute()

    await this.auctionRepository
      .createQueryBuilder()
      .update(Auction)
      .set({ status: AuctionStatus.AWAITING_PAYMENT })
      .where('status = :ended', { ended: AuctionStatus.ENDED })
      .andWhere('winning_bidder_id IS NOT NULL')
      .andWhere('payment_status = :unpaid', { unpaid: AuctionPaymentStatus.UNPAID })
      .execute()

    await this.auctionRepository
      .createQueryBuilder()
      .update(Auction)
      .set({ status: AuctionStatus.FAILED })
      .where('status = :awaitingPayment', { awaitingPayment: AuctionStatus.AWAITING_PAYMENT })
      .andWhere('payment_deadline_at <= :now', { now })
      .execute()

    const endedWithWinner = await this.auctionRepository.find({
      where: {
        status: AuctionStatus.ENDED,
        winningBidderId: Not(IsNull()),
      },
    })

    for (const auction of endedWithWinner) {
      if (!auction.reservePrice || auction.winningAmount >= auction.reservePrice) {
        continue
      }

      auction.winningBidderId = null
      auction.winningBidderName = null
      auction.winningAmount = null
      auction.reserveMet = false
      await this.auctionRepository.save(auction)
    }
  }

  private getMinimumBidAmount(auction: Auction): number {
    if (auction.bidIncrementType === BidIncrementType.PERCENT) {
      return auction.currentPrice + (auction.currentPrice * auction.bidIncrementPercent) / 100
    }

    return auction.currentPrice + auction.minimumBidIncrement
  }

  private getDurationDays(startsAt: Date, endsAt: Date): number {
    const days = Math.ceil((endsAt.getTime() - startsAt.getTime()) / (1000 * 60 * 60 * 24))
    return Math.max(1, days)
  }

  private minutesUntil(target: Date, from: Date): number {
    return (target.getTime() - from.getTime()) / (1000 * 60)
  }

  private addMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() + minutes * 60 * 1000)
  }
}
