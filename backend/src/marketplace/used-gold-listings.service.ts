import { BadRequestException, Injectable, NotFoundException, Optional } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import {
  UsedGoldListing,
  UsedGoldListingSaleType,
  UsedGoldListingStatus,
  UsedGoldQualityStatus,
  UsedGoldSource,
} from './used-gold-listing.entity'
import {
  CreateUsedGoldListingDto,
  ReviewUsedGoldListingDto,
  UpdateUsedGoldListingStatusDto,
  PurchaseUsedGoldListingDto,
} from './create-used-gold-listing.dto'
import { User } from '../users/user.entity'
import { Order, OrderStatus, PaymentMethod } from '../orders/order.entity'
import { EscrowPayment, EscrowPaymentStatus } from '../escrow/escrow-payment.entity'
import { WalletService } from '../wallet/wallet.service'
import { randomUUID } from 'crypto'
import { GoldPricingService } from '../gold-pricing/gold-pricing.service'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'

@Injectable()
export class UsedGoldListingsService {
  constructor(
    @InjectRepository(UsedGoldListing)
    private listingRepository: Repository<UsedGoldListing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
    @Optional() private readonly goldPricing?: GoldPricingService,
    @Optional() @InjectRepository(Order) private readonly orderRepository?: Repository<Order>,
    @Optional() @InjectRepository(SmartVaultAsset) private readonly vaultAssetRepository?: Repository<SmartVaultAsset>,
  ) {}

  async findAll(status?: UsedGoldListingStatus): Promise<UsedGoldListing[]> {
    const publicStatuses = [UsedGoldListingStatus.APPROVED, UsedGoldListingStatus.ACTIVE]
    const where = status && publicStatuses.includes(status) ? { status } : { status: UsedGoldListingStatus.ACTIVE }

    return this.listingRepository.find({
      where,
      order: { createdAt: 'DESC' },
    })
  }

  async findAllForAdmin(status?: UsedGoldListingStatus): Promise<UsedGoldListing[]> {
    return this.listingRepository.find({
      where: status ? { status } : {},
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<UsedGoldListing | null> {
    const listing = await this.listingRepository.findOneBy({ id })

    if (!listing) {
      return null
    }

    await this.listingRepository.increment({ id }, 'viewCount', 1)
    return { ...listing, viewCount: listing.viewCount + 1 }
  }

  async findByUser(userId: string): Promise<UsedGoldListing[]> {
    return this.listingRepository.findBy({ sellerId: userId })
  }

  async createListing(data: CreateUsedGoldListingDto): Promise<UsedGoldListing> {
    const seller = await this.userRepository.findOneBy({ id: data.sellerId })

    if (!seller) {
      throw new NotFoundException('فروشنده یافت نشد')
    }

    const internalAsset = Boolean(data.orderId) || Boolean(data.vaultAssetId) || data.source === UsedGoldSource.GOLDEKSA_PURCHASE
    if (internalAsset) {
      if (data.vaultAssetId) {
        if (!this.vaultAssetRepository) throw new BadRequestException('صندوقچه در دسترس نیست')
        const asset = await this.vaultAssetRepository.findOneBy({ id: data.vaultAssetId })
        if (!asset || asset.userId !== seller.id) throw new BadRequestException('این دارایی صندوقچه متعلق به فروشنده نیست')
        if (Math.abs(Number(asset.weight) - data.weight) > 0.01 || Number(asset.karat) !== data.karat) {
          throw new BadRequestException('وزن یا عیار آگهی با دارایی صندوقچه مطابقت ندارد')
        }
        const priorListing = await this.listingRepository.findOne({
          where: { vaultAssetId: data.vaultAssetId, status: In([
            UsedGoldListingStatus.PENDING_REVIEW,
            UsedGoldListingStatus.APPROVED,
            UsedGoldListingStatus.ACTIVE,
            UsedGoldListingStatus.SOLD,
          ]) },
        })
        if (priorListing) throw new BadRequestException('این دارایی صندوقچه قبلاً در بازار ثبت شده است')
      } else {
      if (!data.orderId || !this.orderRepository) {
        throw new BadRequestException('برای فروش دارایی گلدکسا، سفارش منبع الزامی است')
      }
      const sourceOrder = await this.orderRepository.findOneBy({ id: data.orderId })
      if (!sourceOrder || sourceOrder.userId !== seller.id || sourceOrder.status !== OrderStatus.DELIVERED) {
        throw new BadRequestException('فقط طلای تحویل‌شده‌ی متعلق به همین کاربر قابل ثبت در بازار است')
      }
      const items = Array.isArray(sourceOrder.items) ? sourceOrder.items as Array<Record<string, unknown>> : []
      const matchingItem = items.some((item) =>
        (!data.productId || String(item.productId ?? '') === data.productId) &&
        Number(item.weight ?? 0) > 0 && Math.abs(Number(item.weight) - data.weight) <= 0.01 &&
        Number(item.karat ?? 0) === data.karat,
      )
      if (!matchingItem) {
        throw new BadRequestException('وزن، عیار یا محصول آگهی با سفارش منبع مطابقت ندارد')
      }
      const priorListing = await this.listingRepository.findOne({
        where: { orderId: data.orderId, status: In([
          UsedGoldListingStatus.PENDING_REVIEW,
          UsedGoldListingStatus.APPROVED,
          UsedGoldListingStatus.ACTIVE,
          UsedGoldListingStatus.SOLD,
        ]) },
      })
      if (priorListing) throw new BadRequestException('این دارایی قبلاً در بازار ثبت شده است')
      }
    }

    if (!Number.isFinite(data.weight) || data.weight <= 0 || !Number.isInteger(data.karat) || data.karat < 1 || data.karat > 24) {
      throw new BadRequestException('وزن و عیار آگهی نامعتبر است')
    }

    if (data.saleType === UsedGoldListingSaleType.DIRECT && (!Number.isFinite(data.fixedPrice) || (data.fixedPrice ?? 0) <= 0)) {
      throw new BadRequestException('برای فروش مستقیم قیمت ثابت الزامی است')
    }

    if (data.saleType === UsedGoldListingSaleType.AUCTION && (!Number.isFinite(data.startingPrice) || (data.startingPrice ?? 0) <= 0)) {
      throw new BadRequestException('برای مزایده قیمت پایه الزامی است')
    }
    if (data.saleType === UsedGoldListingSaleType.AUCTION && (!Number.isFinite(data.minimumBidIncrement) || (data.minimumBidIncrement ?? 0) <= 0)) {
      throw new BadRequestException('حداقل افزایش مزایده الزامی است')
    }

    const valuation = this.goldPricing
      ? await this.goldPricing.getGoldValuation(data.weight, data.karat).catch((error: unknown) => {
        throw new BadRequestException((error as Error).message || 'قیمت زنده طلا در دسترس نیست')
      })
      : null

    const listing = this.listingRepository.create({
      ...data,
      sellerId: seller.id,
      sellerName: seller.name,
      vaultAssetId: data.vaultAssetId ?? null,
      images: data.images ?? [],
      stones: data.stones ?? null,
      dimensions: data.dimensions ?? null,
      metalColor: data.metalColor ?? null,
      lockType: data.lockType ?? null,
      fixedPrice: data.fixedPrice ?? null,
      startingPrice: data.startingPrice ?? null,
      reservePrice: data.reservePrice ?? null,
      minimumBidIncrement: data.minimumBidIncrement ?? null,
      auctionDurationDays: data.auctionDurationDays ?? 3,
      autoExtendEnabled: data.autoExtendEnabled ?? true,
      autoExtendMinutes: data.autoExtendMinutes ?? 2,
      autoExtendSeconds: data.autoExtendSeconds ?? 300,
      paymentWindowMinutes: data.paymentWindowMinutes ?? 1440,
      commissionRate: data.commissionRate ?? 0,
      qualityStatus: UsedGoldQualityStatus.NOT_SENT,
      qualityBadge: false,
      gold18PriceSnapshot: valuation?.gold18Price ?? null,
      intrinsicGoldValue: valuation?.intrinsicValue ?? null,
      priceSnapshotAt: valuation?.capturedAt ?? null,
      status: UsedGoldListingStatus.PENDING_REVIEW,
    })

    return this.listingRepository.save(listing)
  }

  async reviewListing(id: string, data: ReviewUsedGoldListingDto): Promise<UsedGoldListing | null> {
    const listing = await this.listingRepository.findOneBy({ id })
    if (!listing) throw new NotFoundException('آگهی موردنظر یافت نشد')
    if (![UsedGoldListingStatus.PENDING_REVIEW, UsedGoldListingStatus.REJECTED].includes(listing.status)) {
      throw new BadRequestException('این آگهی در وضعیت قابل بازبینی نیست')
    }
    const nextStatus = data.qualityStatus === UsedGoldQualityStatus.APPROVED
      ? UsedGoldListingStatus.APPROVED
      : data.qualityStatus === UsedGoldQualityStatus.REJECTED
        ? UsedGoldListingStatus.REJECTED
        : UsedGoldListingStatus.PENDING_REVIEW
    await this.listingRepository.update(id, {
      qualityStatus: data.qualityStatus,
      expertName: data.expertName ?? null,
      expertNotes: data.expertNotes ?? null,
      qualityBadge: data.qualityStatus === UsedGoldQualityStatus.APPROVED,
      status: nextStatus,
    })

    return this.listingRepository.findOneBy({ id })
  }

  async updateStatus(
    id: string,
    data: UpdateUsedGoldListingStatusDto,
  ): Promise<UsedGoldListing | null> {
    const listing = await this.listingRepository.findOneBy({ id })
    if (!listing) throw new NotFoundException('آگهی موردنظر یافت نشد')
    const transitions: Record<UsedGoldListingStatus, UsedGoldListingStatus[]> = {
      [UsedGoldListingStatus.DRAFT]: [UsedGoldListingStatus.PENDING_REVIEW, UsedGoldListingStatus.CANCELLED],
      [UsedGoldListingStatus.PENDING_REVIEW]: [UsedGoldListingStatus.APPROVED, UsedGoldListingStatus.REJECTED, UsedGoldListingStatus.CANCELLED],
      [UsedGoldListingStatus.APPROVED]: [UsedGoldListingStatus.ACTIVE, UsedGoldListingStatus.CANCELLED],
      [UsedGoldListingStatus.REJECTED]: [UsedGoldListingStatus.PENDING_REVIEW, UsedGoldListingStatus.CANCELLED],
      [UsedGoldListingStatus.ACTIVE]: [UsedGoldListingStatus.CANCELLED],
      [UsedGoldListingStatus.SOLD]: [],
      [UsedGoldListingStatus.CANCELLED]: [],
    }
    if (listing.status === data.status) return listing
    if (!transitions[listing.status].includes(data.status)) {
      throw new BadRequestException(`تغییر وضعیت آگهی از ${listing.status} به ${data.status} مجاز نیست`)
    }
    if (data.status === UsedGoldListingStatus.ACTIVE && listing.qualityStatus !== UsedGoldQualityStatus.APPROVED) {
      throw new BadRequestException('آگهی قبل از فعال‌شدن باید تأیید کارشناسی شود')
    }
    await this.listingRepository.update(id, { status: data.status })
    return this.listingRepository.findOneBy({ id })
  }

  async cancelOwnListing(id: string, sellerId: string): Promise<UsedGoldListing> {
    const listing = await this.listingRepository.findOneBy({ id })
    if (!listing) throw new NotFoundException('آگهی موردنظر یافت نشد')
    if (listing.sellerId !== sellerId) throw new BadRequestException('این آگهی متعلق به شما نیست')
    if ([UsedGoldListingStatus.SOLD, UsedGoldListingStatus.CANCELLED].includes(listing.status)) {
      throw new BadRequestException('آگهی در وضعیت قابل لغو نیست')
    }
    listing.status = UsedGoldListingStatus.CANCELLED
    return this.listingRepository.save(listing)
  }

  /**
   * Atomically purchases a direct-sale listing with the buyer's wallet.
   * The listing lock, order, escrow hold and sold transition are one unit:
   * a retry can never buy the same listing twice.
   */
  async purchaseDirect(
    id: string,
    data: PurchaseUsedGoldListingDto,
    buyerId: string,
  ): Promise<{ order: Order; escrow: EscrowPayment; listing: UsedGoldListing }> {
    if (!buyerId) throw new BadRequestException('خریدار معتبر نیست')

    return this.dataSource.transaction(async (manager) => {
      if (data.idempotencyKey?.trim()) {
        const previous = await manager.findOne(EscrowPayment, {
          where: { idempotencyKey: data.idempotencyKey.trim() },
        })
        if (previous) {
          if (previous.buyerId !== buyerId || previous.listingId !== id || !previous.orderId) {
            throw new BadRequestException('کلید idempotency قبلاً برای معامله‌ی دیگری استفاده شده است')
          }
          const previousOrder = await manager.findOneBy(Order, { id: previous.orderId })
          const previousListing = await manager.findOneBy(UsedGoldListing, { id })
          if (previousOrder && previousListing) return { order: previousOrder, escrow: previous, listing: previousListing }
        }
      }

      const listing = await manager.findOne(UsedGoldListing, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      })

      if (!listing) throw new NotFoundException('آگهی موردنظر یافت نشد')
      if (listing.sellerId === buyerId) throw new BadRequestException('خرید آگهی خودتان مجاز نیست')
      if (listing.saleType !== UsedGoldListingSaleType.DIRECT) {
        throw new BadRequestException('این آگهی برای فروش مستقیم نیست')
      }
      if (![UsedGoldListingStatus.APPROVED, UsedGoldListingStatus.ACTIVE].includes(listing.status)) {
        throw new BadRequestException('این آگهی در حال حاضر قابل خرید نیست')
      }

      const amount = Number(listing.fixedPrice)
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException('قیمت آگهی نامعتبر است')
      }

      const existing = await manager.findOne(EscrowPayment, {
        where: { listingId: id, buyerId },
      })
      if (existing) {
        const existingOrder = existing.orderId
          ? await manager.findOneBy(Order, { id: existing.orderId })
          : null
        if (existingOrder) return { order: existingOrder, escrow: existing, listing }
        throw new BadRequestException('برای این آگهی قبلاً معامله‌ای ثبت شده است')
      }

      const order = await manager.save(Order, manager.create(Order, {
        orderNumber: `GX-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        userId: buyerId,
        items: [{
          listingId: listing.id,
          name: listing.title,
          quantity: 1,
          unitPrice: amount,
          totalPrice: amount,
          weight: Number(listing.weight),
          karat: listing.karat,
        }],
        totalAmount: amount,
        shippingCost: 0,
        status: OrderStatus.PENDING,
        address: data.address,
        paymentMethod: PaymentMethod.WALLET,
      }))

      const escrow = await manager.save(EscrowPayment, manager.create(EscrowPayment, {
        listingId: listing.id,
        auctionId: null,
        orderId: order.id,
        idempotencyKey: data.idempotencyKey?.trim() || null,
        buyerId,
        sellerId: listing.sellerId,
        amount,
        fee: 0,
        status: EscrowPaymentStatus.INITIATED,
        authority: null,
        paymentUrl: null,
        trackingCode: null,
      }))

      await this.walletService.ensureWalletForUser(buyerId)
      await this.walletService.holdEscrow(buyerId, escrow.id, amount, manager)

      order.status = OrderStatus.PAID
      listing.status = UsedGoldListingStatus.SOLD
      await manager.save(order)
      await manager.save(listing)
      escrow.status = EscrowPaymentStatus.HELD
      await manager.save(escrow)

      return { order, escrow, listing }
    })
  }
}
