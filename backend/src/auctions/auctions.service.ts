import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, IsNull, Not, Repository } from 'typeorm'
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
    private readonly dataSource: DataSource,
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

    if (Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime()) || endsAt <= startsAt) {
      throw new BadRequestException('زمان پایان مزایده باید بعد از زمان شروع باشد')
    }

    if (!Number.isFinite(data.startingPrice) || data.startingPrice <= 0 || !Number.isFinite(data.minimumBidIncrement) || data.minimumBidIncrement <= 0) {
      throw new BadRequestException('قیمت شروع و حداقل افزایش باید بزرگ‌تر از صفر باشند')
    }
    if (data.bidIncrementType === BidIncrementType.PERCENT && (!Number.isFinite(data.bidIncrementPercent) || (data.bidIncrementPercent ?? 0) <= 0)) {
      throw new BadRequestException('درصد افزایش پیشنهاد باید بزرگ‌تر از صفر باشد')
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

    if (auction.sellerId === bidderId) {
      throw new BadRequestException('فروشنده نمی‌تواند روی مزایده خودش پیشنهاد ثبت کند')
    }

    return this.dataSource.transaction(async (manager) => {
      const lockedAuction = await manager.findOne(Auction, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!lockedAuction) throw new NotFoundException('مزایده یافت نشد')
      if (![AuctionStatus.ACTIVE, AuctionStatus.EXTENDED].includes(lockedAuction.status)) {
        throw new BadRequestException('مزایده در حال حاضر برای ثبت پیشنهاد فعال نیست')
      }

      const minimumAmount = this.getMinimumBidAmount(lockedAuction)
      if (!Number.isFinite(data.amount) || data.amount < minimumAmount) {
        throw new BadRequestException(`حداقل مبلغ پیشنهاد ${minimumAmount.toLocaleString('fa-IR')} تومان است`)
      }

      await manager.update(AuctionBid, { auctionId: id, isWinning: true }, { isWinning: false })
      const now = new Date()
      const shouldExtend = this.minutesUntil(lockedAuction.endsAt, now) <= lockedAuction.autoExtendMinutes && lockedAuction.autoExtendSeconds > 0
      if (shouldExtend) {
        lockedAuction.endsAt = new Date(lockedAuction.endsAt.getTime() + lockedAuction.autoExtendSeconds * 1000)
        lockedAuction.paymentDeadlineAt = this.addMinutes(lockedAuction.endsAt, lockedAuction.paymentWindowMinutes)
        lockedAuction.status = AuctionStatus.EXTENDED
      }

      await manager.save(AuctionBid, manager.create(AuctionBid, {
        auctionId: id,
        bidderId,
        bidderName: bidder.name,
        amount: data.amount,
        isWinning: true,
      }))
      lockedAuction.currentPrice = data.amount
      lockedAuction.bidCount += 1
      if (lockedAuction.winningBidderId && lockedAuction.winningBidderId !== bidderId) {
        lockedAuction.secondWinnerId = lockedAuction.winningBidderId
        lockedAuction.secondWinnerName = lockedAuction.winningBidderName
        lockedAuction.secondWinnerAmount = lockedAuction.winningAmount
      }
      lockedAuction.winningBidderId = bidderId
      lockedAuction.winningBidderName = bidder.name
      lockedAuction.winningAmount = data.amount
      lockedAuction.reserveMet = !lockedAuction.reservePrice || data.amount >= lockedAuction.reservePrice
      return manager.save(Auction, lockedAuction)
    })
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

    // Ending an auction is not the same as receiving the winner's money.
    // Keep the winner and move to the payment window; escrow payment will
    // later change the payment status to ESCROW_HELD.
    auction.paymentStatus = AuctionPaymentStatus.UNPAID
    auction.commissionAmount = (amount * Number(auction.commissionRate ?? 0)) / 100
    auction.status = AuctionStatus.AWAITING_PAYMENT

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
