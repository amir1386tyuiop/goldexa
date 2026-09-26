import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, QueryFailedError, Repository } from 'typeorm'
import { EscrowPayment, EscrowPaymentStatus } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import {
  UsedGoldListing,
  UsedGoldListingSaleType,
  UsedGoldListingStatus,
} from '../marketplace/used-gold-listing.entity'
import { Auction, AuctionPaymentStatus, AuctionStatus } from '../auctions/auction.entity'
import { Order, OrderStatus } from '../orders/order.entity'
import { WalletService } from '../wallet/wallet.service'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'
import { Product } from '../products/product.entity'
import { PlatformRevenue } from '../finance/platform-revenue.entity'
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
    @InjectRepository(PlatformRevenue)
    private readonly revenueRepository: Repository<PlatformRevenue>,
    @InjectRepository(SmartVaultAsset)
    @Optional() private readonly vaultAssetRepository?: Repository<SmartVaultAsset>,
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

    try {
      return await this.escrowRepository.save(
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
          disputeReason: null,
          disputedBy: null,
          disputedAt: null,
          resolutionNote: null,
          resolvedAt: null,
          // Funds are not considered held until the payment provider confirms them.
          status: EscrowPaymentStatus.INITIATED,
        }),
      )
    } catch (error) {
      // The database partial unique index is the race-safe final guard. Convert
      // its violation into the same domain error as the pre-check above.
      if (error instanceof QueryFailedError && (error as QueryFailedError & { driverError?: { code?: string } }).driverError?.code === '23505') {
        throw new BadRequestException('برای این معامله یک escrow فعال از قبل وجود دارد')
      }
      throw error
    }
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
      [EscrowPaymentStatus.HELD]: [EscrowPaymentStatus.SHIPPED, EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.DISPUTED],
      [EscrowPaymentStatus.SHIPPED]: [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED, EscrowPaymentStatus.DISPUTED],
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
      if (payment.status === EscrowPaymentStatus.DISPUTED &&
        [EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED].includes(nextStatus) &&
        !data.resolutionNote?.trim()) {
        throw new BadRequestException('یادداشت حل اختلاف الزامی است')
      }

      if (nextStatus === EscrowPaymentStatus.HELD) {
        await this.walletService.holdEscrow(payment.buyerId, payment.id, Number(payment.amount), manager)
      } else if (nextStatus === EscrowPaymentStatus.RELEASED) {
        const sellerAmount = Math.max(0, Number(payment.amount) - Number(payment.fee ?? 0))
        if (sellerAmount <= 0) throw new BadRequestException('مبلغ قابل پرداخت به فروشنده نامعتبر است')
        await this.walletService.releaseEscrow(payment.sellerId, payment.id, sellerAmount, manager)
        const fee = Number(payment.fee ?? 0)
        if (fee > 0) {
          await manager.save(PlatformRevenue, manager.create(PlatformRevenue, {
            sourceType: payment.auctionId ? 'auction_commission' : 'marketplace_commission',
            sourceId: payment.id,
            amount: fee,
          }))
        }
      } else if (nextStatus === EscrowPaymentStatus.REFUNDED) {
        await this.walletService.refundEscrow(payment.buyerId, payment.id, Number(payment.amount), manager)
      }

      await this.syncRelatedState(manager, payment, nextStatus)

      payment.status = nextStatus
      payment.trackingCode = data.trackingCode ?? payment.trackingCode
      if (payment.status === EscrowPaymentStatus.RELEASED || payment.status === EscrowPaymentStatus.REFUNDED) {
        payment.resolutionNote = data.resolutionNote?.trim() ?? payment.resolutionNote
        payment.resolvedAt = new Date()
      }
      return manager.save(payment)
    })
  }

  /**
   * Escrow is the source of truth for settlement. Keep the related order and
   * auction in the same database transaction as the wallet ledger so a
   * successful release can never leave the UI/reporting state behind.
   */
  private async syncRelatedState(
    manager: EntityManager,
    payment: EscrowPayment,
    nextStatus: EscrowPaymentStatus,
  ): Promise<void> {
    if (payment.orderId) {
      const orderStatus = nextStatus === EscrowPaymentStatus.RELEASED
        ? OrderStatus.DELIVERED
        : nextStatus === EscrowPaymentStatus.REFUNDED
          ? OrderStatus.CANCELLED
          : nextStatus === EscrowPaymentStatus.HELD
            ? OrderStatus.PAID
            : nextStatus === EscrowPaymentStatus.SHIPPED
              ? OrderStatus.SHIPPED
            : null
      if (orderStatus) {
        await manager.update(Order, payment.orderId, {
          status: orderStatus,
          ...(payment.trackingCode ? { trackingCode: payment.trackingCode } : {}),
        })
      }
    }

    if (nextStatus === EscrowPaymentStatus.RELEASED) {
      await this.transferOwnership(manager, payment)
    }

    if (!payment.auctionId) return

    const auction = await manager.findOne(Auction, {
      where: { id: payment.auctionId },
      lock: { mode: 'pessimistic_write' },
    })
    if (!auction) throw new NotFoundException('مزایده مرتبط با escrow یافت نشد')
    if (auction.winningBidderId !== payment.buyerId || Number(auction.winningAmount) !== Number(payment.amount)) {
      throw new BadRequestException('escrow با برنده یا مبلغ مزایده مطابقت ندارد')
    }

    if (nextStatus === EscrowPaymentStatus.HELD) {
      if (auction.productId && !auction.inventoryReserved) {
        const product = await manager.findOne(Product, {
          where: { id: auction.productId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!product) throw new NotFoundException('محصول مزایده یافت نشد')
        if (product.stock < 1) throw new BadRequestException('موجودی محصول مزایده کافی نیست')
        product.stock -= 1
        await manager.save(product)
        auction.inventoryReserved = true
      }
      auction.paymentStatus = AuctionPaymentStatus.ESCROW_HELD
    } else if (nextStatus === EscrowPaymentStatus.RELEASED) {
      auction.paymentStatus = AuctionPaymentStatus.SETTLED
      auction.status = AuctionStatus.COMPLETED
      auction.paymentDeadlineAt = null
      auction.inventoryReserved = false
    } else if (nextStatus === EscrowPaymentStatus.REFUNDED) {
      if (auction.productId && auction.inventoryReserved) {
        const product = await manager.findOne(Product, {
          where: { id: auction.productId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!product) throw new NotFoundException('محصول مزایده یافت نشد')
        product.stock += 1
        await manager.save(product)
        auction.inventoryReserved = false
      }
      auction.paymentStatus = AuctionPaymentStatus.REFUNDED
      auction.status = AuctionStatus.FAILED
    }
    await manager.save(Auction, auction)
  }

  /** Create the buyer's immutable ownership record exactly once after escrow release. */
  private async transferOwnership(manager: EntityManager, payment: EscrowPayment): Promise<void> {
    if (!this.vaultAssetRepository || (!payment.listingId && !payment.auctionId)) return

    const existing = await manager.findOne(SmartVaultAsset, { where: { sourceEscrowId: payment.id } })
    if (existing) return

    let name = 'طلای بازار دست‌دوم'
    let category: string | null = null
    let productId: string | null = null
    let weight = 0
    let karat = 18
    let images: string[] = []
    let intrinsicValue = Number(payment.amount)

    if (payment.listingId) {
      const listing = await manager.findOne(UsedGoldListing, { where: { id: payment.listingId } })
      if (!listing) throw new NotFoundException('آگهی مرتبط با escrow یافت نشد')
      name = listing.title
      productId = listing.productId
      weight = Number(listing.weight)
      karat = Number(listing.karat)
      images = listing.images ?? []
      intrinsicValue = Number(listing.intrinsicGoldValue ?? payment.amount)
      if (listing.vaultAssetId) {
        const asset = await manager.findOne(SmartVaultAsset, {
          where: { id: listing.vaultAssetId },
          lock: { mode: 'pessimistic_write' },
        })
        if (!asset) throw new NotFoundException('دارایی صندوقچه مرتبط با آگهی یافت نشد')
        if (asset.lastTransferEscrowId === payment.id) return
        if (asset.userId !== payment.sellerId) throw new BadRequestException('مالک فعلی دارایی با فروشنده یکسان نیست')
        asset.userId = payment.buyerId
        asset.orderId = payment.orderId
        asset.lastTransferEscrowId = payment.id
        asset.purchasePrice = Number(payment.amount)
        asset.purchaseDate = new Date()
        asset.currentRawGoldValue = intrinsicValue
        asset.currentValue = intrinsicValue
        asset.profitLoss = intrinsicValue - Number(payment.amount)
        asset.profitLossPercent = Number(payment.amount) > 0 ? ((intrinsicValue - Number(payment.amount)) / Number(payment.amount)) * 100 : 0
        asset.metadata = { ...(asset.metadata && typeof asset.metadata === 'object' ? asset.metadata as Record<string, unknown> : {}), lastOwnershipTransfer: { escrowId: payment.id, previousOwnerId: payment.sellerId, transferredAt: new Date().toISOString() } }
        await manager.save(SmartVaultAsset, asset)
        return
      }
    } else if (payment.auctionId) {
      const auction = await manager.findOne(Auction, { where: { id: payment.auctionId } })
      if (!auction) throw new NotFoundException('مزایده مرتبط با escrow یافت نشد')
      productId = auction.productId
      intrinsicValue = Number(auction.intrinsicGoldValue ?? payment.amount)
      if (productId) {
        const product = await manager.findOne(Product, { where: { id: productId } })
        if (product) {
          name = product.name
          category = String(product.category)
          weight = Number(product.weight)
          karat = Number(product.karat)
          images = product.images ?? []
        }
      }
    }

    if (!Number.isFinite(weight) || weight <= 0) {
      throw new BadRequestException('وزن دارایی برای انتقال مالکیت معتبر نیست')
    }

    const asset = manager.create(SmartVaultAsset, {
      userId: payment.buyerId,
      productId,
      orderId: payment.orderId,
      sourceEscrowId: payment.id,
      name,
      category,
      weight,
      karat,
      purchasePrice: Number(payment.amount),
      purchaseDate: new Date(),
      currentRawGoldValue: intrinsicValue,
      currentValue: intrinsicValue,
      profitLoss: intrinsicValue - Number(payment.amount),
      profitLossPercent: Number(payment.amount) > 0 ? ((intrinsicValue - Number(payment.amount)) / Number(payment.amount)) * 100 : 0,
      images,
      metadata: { ownershipSource: 'escrow_release', escrowId: payment.id, sellerId: payment.sellerId },
    })
    await manager.save(SmartVaultAsset, asset)
  }

  async openDispute(id: string, userId: string, reason: string): Promise<EscrowPayment> {
    const cleanReason = reason?.trim()
    if (!cleanReason) throw new BadRequestException('دلیل اختلاف الزامی است')
    return this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(EscrowPayment, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })
      if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')
      if (payment.buyerId !== userId && payment.sellerId !== userId) {
        throw new ForbiddenException('این escrow متعلق به شما نیست')
      }
      if (![EscrowPaymentStatus.HELD, EscrowPaymentStatus.SHIPPED].includes(payment.status)) {
        throw new BadRequestException('فقط escrow نگه‌داری‌شده قابل اختلاف است')
      }
      payment.status = EscrowPaymentStatus.DISPUTED
      payment.disputeReason = cleanReason
      payment.disputedBy = userId
      payment.disputedAt = new Date()
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
      payment.status = EscrowPaymentStatus.SHIPPED
      return manager.save(payment)
    })
  }

  async confirmDelivery(id: string, buyerId: string): Promise<EscrowPayment> {
    const payment = await this.escrowRepository.findOneBy({ id })
    if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')
    if (payment.buyerId !== buyerId) throw new ForbiddenException('این escrow متعلق به شما نیست')
    if (payment.status !== EscrowPaymentStatus.SHIPPED) {
      throw new BadRequestException('فقط escrow ارسال‌شده قابل تایید است')
    }
    return (await this.updatePaymentStatus(id, { status: EscrowPaymentStatus.RELEASED })) as EscrowPayment
  }

  async payFromWallet(id: string, buyerId: string): Promise<EscrowPayment> {
    const payment = await this.escrowRepository.findOneBy({ id })
    if (!payment) throw new NotFoundException('پرداخت امانی یافت نشد')
    if (payment.buyerId !== buyerId) throw new ForbiddenException('این escrow متعلق به شما نیست')
    if (payment.status !== EscrowPaymentStatus.INITIATED) {
      throw new BadRequestException('این escrow قبلاً پرداخت یا بسته شده است')
    }
    return (await this.updatePaymentStatus(id, { status: EscrowPaymentStatus.HELD })) as EscrowPayment
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

    const escrows = await this.escrowRepository.find({
      where: data.listingId ? { listingId: data.listingId } : { orderId: data.orderId },
      order: { createdAt: 'DESC' },
    })
    const completedTrade = escrows.find((payment) =>
      payment.status === EscrowPaymentStatus.RELEASED &&
      ((payment.buyerId === data.reviewerId && payment.sellerId === data.revieweeId) ||
        (payment.sellerId === data.reviewerId && payment.buyerId === data.revieweeId)),
    )
    if (!completedTrade) {
      throw new ForbiddenException('فقط طرفین یک معامله‌ی تسویه‌شده می‌توانند امتیاز بدهند')
    }

    const duplicate = await this.ratingRepository.find({
      where: { reviewerId: data.reviewerId, revieweeId: data.revieweeId },
    })
    if (duplicate.some((rating) =>
      (data.listingId && rating.listingId === data.listingId) ||
      (data.orderId && rating.orderId === data.orderId),
    )) {
      throw new BadRequestException('برای این معامله قبلاً امتیاز ثبت شده است')
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
