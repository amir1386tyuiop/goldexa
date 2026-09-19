import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Order, OrderStatus } from '../orders/order.entity'
import { OrderStatusHistory } from '../orders/order-status-history.entity'
import { Refund } from '../orders/refund.entity'
import { User, UserRole } from '../users/user.entity'
import { Product } from '../products/product.entity'
import { GoldPrice } from '../gold-pricing/gold-price.entity'
import { Auction, AuctionStatus } from '../auctions/auction.entity'
import { UsedGoldListing, UsedGoldListingStatus } from '../marketplace/used-gold-listing.entity'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'
import { PriceAlert } from '../smart-vault/price-alert.entity'
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity'
import { JewelryDesign } from '../custom-builder/jewelry-design.entity'
import { AiPricePrediction } from '../ai-engine/ai-price-prediction.entity'
import { EscrowPayment, EscrowPaymentStatus } from '../escrow/escrow-payment.entity'
import { EscrowService } from '../escrow/escrow.service'
import { PaymentTransaction, PaymentTransactionStatus } from '../payments/payment-transaction.entity'
import { ProductCategoryMaster } from '../catalog/product-category-master.entity'
import { Cart } from '../cart/cart.entity'
import { CartItem } from '../cart/cart-item.entity'
import { Wallet } from '../wallet/wallet.entity'
import { PricingRule } from '../pricing/pricing-rule.entity'
import { LiquidityRequest } from '../liquidity/liquidity-request.entity'
import { ArModel } from '../ar/ar-model.entity'
import { ContentPage } from '../content/content-page.entity'
import { AuditLog } from '../audit/audit-log.entity'
import { UserFollow } from '../community-extensions/user-follow.entity'
import { RoleService } from '../auth/role.service'
import { SystemSetting } from '../audit/system-setting.entity'
@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderStatusHistory)
    private orderStatusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Refund)
    private refundRepository: Repository<Refund>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(GoldPrice)
    private goldPriceRepository: Repository<GoldPrice>,
    @InjectRepository(Auction)
    private auctionRepository: Repository<Auction>,
    @InjectRepository(UsedGoldListing)
    private listingRepository: Repository<UsedGoldListing>,
    @InjectRepository(SmartVaultAsset)
    private vaultAssetRepository: Repository<SmartVaultAsset>,
    @InjectRepository(PriceAlert)
    private priceAlertRepository: Repository<PriceAlert>,
    @InjectRepository(SubscriptionPlan)
    private subscriptionPlanRepository: Repository<SubscriptionPlan>,
    @InjectRepository(JewelryDesign)
    private jewelryDesignRepository: Repository<JewelryDesign>,
    @InjectRepository(AiPricePrediction)
    private aiPredictionRepository: Repository<AiPricePrediction>,
    @InjectRepository(EscrowPayment)
    private escrowRepository: Repository<EscrowPayment>,
    @InjectRepository(PaymentTransaction)
    private paymentTransactionRepository: Repository<PaymentTransaction>,
    @InjectRepository(ProductCategoryMaster)
    private categoryRepository: Repository<ProductCategoryMaster>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(PricingRule)
    private pricingRuleRepository: Repository<PricingRule>,
    @InjectRepository(LiquidityRequest)
    private liquidityRequestRepository: Repository<LiquidityRequest>,
    @InjectRepository(ArModel)
    private arModelRepository: Repository<ArModel>,
    @InjectRepository(ContentPage)
    private contentPageRepository: Repository<ContentPage>,
    @InjectRepository(AuditLog)
    private auditLogRepository: Repository<AuditLog>,
    @InjectRepository(UserFollow)
    private userFollowRepository: Repository<UserFollow>,
    @InjectRepository(SystemSetting)
    private systemSettingRepository: Repository<SystemSetting>,
    private roleService: RoleService,
    private readonly escrowService: EscrowService,
  ) {}

  async getDashboardStats() {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [
      totalUsers,
      totalOrders,
      totalProducts,
      totalAuctions,
      totalListings,
      totalVaultAssets,
      totalAlerts,
      totalSubscriptionPlans,
      totalCustomDesigns,
      totalAiPredictions,
      totalEscrowPayments,
      totalPaymentTransactions,
      totalCategories,
      totalCartItems,
      totalWallets,
      totalPricingRules,
      totalLiquidityRequests,
      totalArModels,
      totalContentPages,
      totalAuditLogs,
      totalFollows,
    ] = await Promise.all([
      this.userRepository.count(),
      this.orderRepository.count(),
      this.productRepository.count(),
      this.auctionRepository.count(),
      this.listingRepository.count(),
      this.vaultAssetRepository.count(),
      this.priceAlertRepository.count(),
      this.subscriptionPlanRepository.count(),
      this.jewelryDesignRepository.count(),
      this.aiPredictionRepository.count(),
      this.escrowRepository.count(),
      this.paymentTransactionRepository.count(),
      this.categoryRepository.count(),
      this.cartItemRepository.count(),
      this.walletRepository.count(),
      this.pricingRuleRepository.count(),
      this.liquidityRequestRepository.count(),
      this.arModelRepository.count(),
      this.contentPageRepository.count(),
      this.auditLogRepository.count(),
      this.userFollowRepository.count(),
    ])

    const revenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total_amount), 0)', 'totalRevenue')
      .getRawOne()

    const todayRevenueResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total_amount), 0)', 'todayRevenue')
      .where('order.createdAt >= :today', { today })
      .getRawOne()

    const latestGoldPrice =
      (
        await this.goldPriceRepository.find({
          where: { isValid: true },
          order: { createdAt: 'DESC' },
          take: 1,
        })
      )[0] || null

    const todayOrders = await this.orderRepository
      .createQueryBuilder('order')
      .where('order.createdAt >= :today', { today })
      .getCount()

    const activeAuctions = await this.auctionRepository
      .createQueryBuilder('auction')
      .where('auction.status IN (:...statuses)', {
        statuses: [AuctionStatus.ACTIVE, AuctionStatus.EXTENDED],
      })
      .getCount()
    const pendingReviews = await this.listingRepository.countBy({ status: UsedGoldListingStatus.PENDING_REVIEW })
    const auctionRevenue = await this.auctionRepository
      .createQueryBuilder('auction')
      .select('COALESCE(SUM(auction.winning_amount), 0)', 'auctionRevenue')
      .where('auction.payment_status = :paid OR auction.payment_status = :settled', {
        paid: 'paid',
        settled: 'settled',
      })
      .getRawOne()

    const escrowRevenue = await this.escrowRepository
      .createQueryBuilder('escrow')
      .select('COALESCE(SUM(escrow.fee), 0)', 'escrowRevenue')
      .where('escrow.status IN (:...statuses)', { statuses: ['released', 'refunded', 'disputed'] })
      .getRawOne()

    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalAuctions,
      activeAuctions,
      totalListings,
      pendingReviews,
      totalVaultAssets,
      totalAlerts,
      totalSubscriptionPlans,
      totalCustomDesigns,
      totalAiPredictions,
      totalEscrowPayments,
      totalPaymentTransactions,
      totalCategories,
      totalCartItems,
      totalWallets,
      totalPricingRules,
      totalLiquidityRequests,
      totalArModels,
      totalContentPages,
      totalAuditLogs,
      totalFollows,
      todayOrders,
      totalRevenue: Number(revenueResult?.totalRevenue || 0),
      todayRevenue: Number(todayRevenueResult?.todayRevenue || 0),
      auctionRevenue: Number(auctionRevenue?.auctionRevenue || 0),
      escrowRevenue: Number(escrowRevenue?.escrowRevenue || 0),
      latestGoldPrice,
    }
  }

  async listUsers(limit = 100, role?: string) {
    return this.userRepository.find({
      where: role ? { role: this.parseUserRole(role) } : undefined,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    })
  }

  /** Financial report: revenue aggregates and order breakdown (API spec §13). */
  async getReports() {
    const paid = await this.paymentTransactionRepository
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :s', { s: 'paid' })
      .getRawOne<{ total: string; count: string }>()

    const orders = await this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.totalAmount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('o.status IN (:...statuses)', { statuses: [OrderStatus.PAID, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] })
      .getRawOne<{ total: string; count: string }>()

    const refunds = await this.refundRepository
      .createQueryBuilder('r')
      .select('COALESCE(SUM(r.amount), 0)', 'total')
      .addSelect('COUNT(*)', 'count')
      .where('r.status IN (:...statuses)', { statuses: ['pending', 'approved', 'completed'] })
      .getRawOne<{ total: string; count: string }>()

    const escrow = await this.escrowRepository
      .createQueryBuilder('e')
      .select('COALESCE(SUM(e.fee), 0)', 'total')
      .getRawOne<{ total: string }>()

    const ordersByStatus = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>()

    return {
      revenue: {
        totalPaidPayments: Number(paid?.total ?? 0),
        paidPaymentCount: Number(paid?.count ?? 0),
        totalOrderValue: Number(orders?.total ?? 0),
        orderCount: Number(orders?.count ?? 0),
        escrowFees: Number(escrow?.total ?? 0),
        refunds: Number(refunds?.total ?? 0),
        refundCount: Number(refunds?.count ?? 0),
        netOrderValue: Number(orders?.total ?? 0) - Number(refunds?.total ?? 0),
      },
      ordersByStatus: ordersByStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
      // Revenue streams defined in the business model (populated as modules grow).
      streams: [
        'product_sales_fee',
        'buy_sell_spread',
        'subscriptions',
        'c2c_commission',
        'group_buying_fee',
        'ar_premium',
        'ai_services',
        'ads',
      ],
      generatedAt: new Date().toISOString(),
    }
  }

  async listDisputedEscrows(limit = 100) {
    return this.escrowRepository.find({
      where: { status: EscrowPaymentStatus.DISPUTED },
      order: { disputedAt: 'ASC' },
      take: Math.min(limit, 500),
    })
  }

  async resolveEscrowDispute(id: string, status: EscrowPaymentStatus, resolutionNote: string) {
    if (![EscrowPaymentStatus.RELEASED, EscrowPaymentStatus.REFUNDED].includes(status)) {
      throw new BadRequestException('حل اختلاف فقط با release یا refund مجاز است')
    }
    return this.escrowService.updatePaymentStatus(id, { status, resolutionNote })
  }

  /** Block or unblock a user. Blocked users are refused login. */
  async setUserBlocked(id: string, isBlocked: boolean) {
    const user = await this.userRepository.findOneBy({ id })
    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }
    user.isBlocked = isBlocked
    await this.userRepository.save(user)
    return { id: user.id, name: user.name, phone: user.phone, isBlocked: user.isBlocked }
  }

  async listProducts(limit = 100) {
    return this.productRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    })
  }

  async updateProduct(id: string, updates: Partial<Product>) {
    const existing = await this.productRepository.findOneBy({ id })

    if (!existing) {
      throw new NotFoundException('محصول یافت نشد')
    }

    return this.productRepository.save({ ...existing, ...updates })
  }

  async listOrders(limit = 100, status?: string) {
    return this.orderRepository.find({
      where: status ? { status: this.parseOrderStatus(status) } : undefined,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    })
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    const existing = await this.orderRepository.findOneBy({ id })

    if (!existing) {
      throw new NotFoundException('سفارش یافت نشد')
    }

    const updated = await this.orderRepository.save({ ...existing, status })
    await this.orderStatusHistoryRepository.save(
      this.orderStatusHistoryRepository.create({ orderId: id, status, note: 'به‌روزرسانی از پنل مدیریت' }),
    )
    return updated
  }

  async listPayments(limit = 100, status?: string) {
    return this.paymentTransactionRepository.find({
      where: status ? { status: this.parsePaymentTransactionStatus(status) } : undefined,
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    })
  }

  async verifyPayment(id: string) {
    const payment = await this.paymentTransactionRepository.findOneBy({ id })

    if (!payment) {
      throw new NotFoundException('پرداخت یافت نشد')
    }

    return this.paymentTransactionRepository.save({ ...payment, status: PaymentTransactionStatus.PAID })
  }

  async refundPayment(id: string, status: PaymentTransactionStatus = PaymentTransactionStatus.REFUNDED) {
    const payment = await this.paymentTransactionRepository.findOneBy({ id })

    if (!payment) {
      throw new NotFoundException('پرداخت یافت نشد')
    }

    if (status !== PaymentTransactionStatus.REFUNDED) {
      throw new BadRequestException('وضعیت بازپرداخت نامعتبر است')
    }
    if (payment.status !== PaymentTransactionStatus.PAID) {
      throw new BadRequestException('فقط پرداخت موفق قابل بازپرداخت است')
    }
    return this.paymentTransactionRepository.save({ ...payment, status })
  }

  async listSettings() {
    return this.systemSettingRepository.find({ order: { key: 'ASC' } })
  }

  async updateSetting(key: string, value: unknown, description?: string) {
    const existing = await this.systemSettingRepository.findOneBy({ key })

    if (existing) {
      return this.systemSettingRepository.save({ ...existing, value, description })
    }

    return this.systemSettingRepository.save(this.systemSettingRepository.create({ key, value, description }))
  }

  async listContentPages() {
    return this.contentPageRepository.find({ order: { slug: 'ASC' } })
  }

  async updateContentPage(id: string, updates: Partial<ContentPage>) {
    const existing = await this.contentPageRepository.findOneBy({ id })

    if (!existing) {
      throw new NotFoundException('صفحه محتوا یافت نشد')
    }

    return this.contentPageRepository.save({ ...existing, ...updates })
  }

  async listAuditLogs(limit = 100) {
    return this.auditLogRepository.find({
      order: { createdAt: 'DESC' },
      take: Math.min(limit, 500),
    })
  }

  private parseUserRole(role: string): UserRole {
    const normalized = role.toUpperCase().replace(/-/g, '_')
    return UserRole[normalized as keyof typeof UserRole] || UserRole.BUYER
  }

  private parseOrderStatus(status: string): OrderStatus {
    const normalized = status.toUpperCase().replace(/-/g, '_')
    return OrderStatus[normalized as keyof typeof OrderStatus] || OrderStatus.PENDING
  }

  private parsePaymentTransactionStatus(status: string): PaymentTransactionStatus {
    const normalized = status.toUpperCase().replace(/-/g, '_')
    return (
      PaymentTransactionStatus[normalized as keyof typeof PaymentTransactionStatus] ||
      PaymentTransactionStatus.INITIATED
    )
  }

  async listRoles() {
    return this.roleService.listRoles()
  }

  async listPermissions() {
    return this.roleService.listPermissions()
  }
}
