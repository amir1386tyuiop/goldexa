import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
import { EscrowPayment, EscrowPaymentStatus } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import {
  UsedGoldListing,
  UsedGoldListingSaleType,
  UsedGoldListingStatus,
} from '../marketplace/used-gold-listing.entity'
import { Auction, AuctionStatus } from '../auctions/auction.entity'
import { WalletService } from '../wallet/wallet.service'
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
    @InjectRepository(UsedGoldListing)
    private listingRepository: Repository<UsedGoldListing>,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
  ) {}

  async findPayments(userId?: string, isAdmin = false): Promise<EscrowPayment[]> {
    if (!isAdmin && !userId) throw new BadRequestException('کاربر احراز هویت نشده است')
    const where = isAdmin ? undefined : [{ buyerId: userId }, { sellerId: userId }]
    return this.escrowRepository.find({ where, order: { createdAt: 'DESC' } })
  }

  async findPayment(id: string, userId: string, isAdmin = false): Promise<EscrowPayment | null> {
    const payment = await this.escrowRepository.findOneBy({ id })
    if (!payment) {
      return null
    }
    if (!isAdmin && payment.buyerId !== userId && payment.sellerId !== userId) {
      throw new ForbiddenException('شما به این پرداخت دسترسی ندارید')
    }
    return payment
  }

  async createPayment(data: CreateEscrowPaymentDto): Promise<EscrowPayment> {
    if (!data.buyerId) {
      throw new BadRequestException('خریدار معتبر نیست')
    }

    if (!data.listingId && !data.auctionId) {
      throw new BadRequestException('ارجاع به listing یا auction برای پرداخت امانی الزامی است')
    }

    if (data.listingId && data.auctionId) {
      throw new BadRequestException('پرداخت امانی نمی‌تواند هم‌زمان به listing و auction متصل باشد')
    }
    if (!Number.isFinite(data.amount) || data.amount <= 0 || !Number.isFinite(data.fee ?? 0) || (data.fee ?? 0) < 0 || (data.fee ?? 0) >= data.amount) {
      throw new BadRequestException('مبلغ یا کارمزد escrow نامعتبر است')
    }

    const sellerId = await this.resolveSellerId(data)
    if (data.buyerId === sellerId) {
      throw new BadRequestException('خریدار و فروشنده نمی‌توانند یک کاربر باشند')
    }
    const existing = await this.escrowRepository.findOne({
      where: data.listingId
        ? { listingId: data.listingId, buyerId: data.buyerId, status: EscrowPaymentStatus.INITIATED }
        : { auctionId: data.auctionId, buyerId: data.buyerId, status: EscrowPaymentStatus.INITIATED },
    })
    if (existing) throw new BadRequestException('برای این معامله یک escrow فعال از قبل وجود دارد')

    return this.escrowRepository.save(
      this.escrowRepository.create({
        ...data,
        buyerId: data.buyerId,
        sellerId,
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

  private async resolveSellerId(data: CreateEscrowPaymentDto): Promise<string> {
    if (data.listingId) {
      const listing = await this.listingRepository.findOneBy({ id: data.listingId })
      if (!listing) {
        throw new NotFoundException('listing موردنظر یافت نشد')
      }
      if (![UsedGoldListingStatus.APPROVED, UsedGoldListingStatus.ACTIVE].includes(listing.status)) {
        throw new BadRequestException('listing برای پرداخت فعال نیست')
      }
      if (listing.saleType !== UsedGoldListingSaleType.DIRECT) {
        throw new BadRequestException('برای listing مزایده‌ای باید از شناسه auction استفاده شود')
      }
      if (listing.fixedPrice != null && Number(listing.fixedPrice) !== Number(data.amount)) {
        throw new BadRequestException('مبلغ پرداخت با قیمت listing مطابقت ندارد')
      }
      if (data.sellerId && data.sellerId !== listing.sellerId) {
        throw new BadRequestException('فروشنده با listing مطابقت ندارد')
      }
      return listing.sellerId
    }

    const auction = await this.auctionRepository.findOneBy({ id: data.auctionId as string })
    if (!auction) {
      throw new NotFoundException('auction موردنظر یافت نشد')
    }
    if (![AuctionStatus.ENDED, AuctionStatus.AWAITING_PAYMENT].includes(auction.status)) {
      throw new BadRequestException('auction هنوز برای پرداخت آماده نیست')
    }
    if (!auction.winningBidderId || auction.winningBidderId !== data.buyerId) {
      throw new ForbiddenException('فقط برنده auction می‌تواند پرداخت امانی ایجاد کند')
    }
    if (auction.winningAmount == null || Number(auction.winningAmount) !== Number(data.amount)) {
      throw new BadRequestException('مبلغ پرداخت با مبلغ برنده auction مطابقت ندارد')
    }
    if (data.sellerId && data.sellerId !== auction.sellerId) {
      throw new BadRequestException('فروشنده با auction مطابقت ندارد')
    }
    return auction.sellerId
  }

  async updatePaymentStatus(
    id: string,
    data: UpdateEscrowStatusDto,
  ): Promise<EscrowPayment | null> {
    const transitions: Record<EscrowPaymentStatus, EscrowPaymentStatus[]> = {
      [EscrowPaymentStatus.INITIATED]: [EscrowPaymentStatus.HELD, EscrowPaymentStatus.CANCELLED],
      [EscrowPaymentStatus.HELD]: [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.DISPUTED],
      [EscrowPaymentStatus.DISPUTED]: [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.CANCELLED],
      [EscrowPaymentStatus.RELEASED]: [],
      [EscrowPaymentStatus.REFUNDED]: [],
      [EscrowPaymentStatus.CANCELLED]: [],
    }
    const existingPayment = await this.escrowRepository.findOneBy({ id })
    if (!existingPayment) throw new NotFoundException('پرداخت امانی یافت نشد')
    await this.walletService.ensureWalletForUser(existingPayment.buyerId)
    await this.walletService.ensureWalletForUser(existingPayment.sellerId)
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(EscrowPayment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')

      const nextStatus = data.status as EscrowPaymentStatus
      if (!transitions[payment.status].includes(nextStatus)) {
        throw new BadRequestException(`انتقال وضعیت escrow از ${payment.status} به ${nextStatus} مجاز نیست`)
      }

      if (nextStatus === EscrowPaymentStatus.HELD) {
        await this.walletService.holdEscrow(payment.buyerId, payment.id, Number(payment.amount), manager)
      } else if (nextStatus === EscrowPaymentStatus.RELEASED) {
        const sellerAmount = Math.max(0, Number(payment.amount) - Number(payment.fee ?? 0))
        if (sellerAmount <= 0) throw new BadRequestException('مبلغ قابل پرداخت به فروشنده نامعتبر است')
        await this.walletService.releaseEscrow(payment.sellerId, payment.id, sellerAmount, manager)
      } else if (nextStatus === EscrowPaymentStatus.REFUNDED) {
        await this.walletService.refundEscrow(payment.buyerId, payment.id, Number(payment.amount), manager)
      }

      payment.status = nextStatus
      payment.trackingCode = data.trackingCode ?? payment.trackingCode
      return manager.save(payment)
    })
  }

  async markShipped(id: string, sellerId: string, trackingCode: string): Promise<EscrowPayment> {
    if (!trackingCode?.trim()) throw new BadRequestException('کد رهگیری ارسال الزامی است')
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(EscrowPayment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')
      if (payment.sellerId !== sellerId) throw new ForbiddenException('این escrow متعلق به شما نیست')
      if (payment.status !== EscrowPaymentStatus.HELD) {
        throw new BadRequestException('فقط escrow نگه‌داری‌شده قابل ارسال است')
      }
      payment.trackingCode = trackingCode.trim()
      return manager.save(payment)
    })
  }

  async confirmDelivery(id: string, buyerId: string): Promise<EscrowPayment> {
    const payment = await this.escrowRepository.findOneBy({ id })
    if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')
    if (payment.buyerId !== buyerId) throw new ForbiddenException('این escrow متعلق به شما نیست')
    if (payment.status !== EscrowPaymentStatus.HELD) {
      throw new BadRequestException('فقط escrow نگه‌داری‌شده قابل تایید است')
    }
    return (await this.updatePaymentStatus(id, { status: EscrowPaymentStatus.RELEASED })) as EscrowPayment
  }

  async findRatings(): Promise<MarketplaceRating[]> {
    return this.ratingRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findRatingsByUser(userId: string): Promise<MarketplaceRating[]> {
    return this.ratingRepository.findBy({ revieweeId: userId })
  }

  async createRating(data: CreateMarketplaceRatingDto): Promise<MarketplaceRating> {
    if (!data.reviewerId || data.reviewerId === data.revieweeId) {
      throw new BadRequestException('ثبت امتیاز برای خود یا بدون کاربر معتبر مجاز نیست')
    }
    if (!data.listingId && !data.orderId) {
      throw new BadRequestException('امتیاز باید به listing یا order متصل باشد')
    }
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
