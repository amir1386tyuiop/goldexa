import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ScheduleModule } from '@nestjs/schedule'
import { RedisModule } from './common/redis.module'
import { AppController } from './app.controller'

import { AuctionsModule } from './auctions/auctions.module'
import { GoldPricingModule } from './gold-pricing/gold-pricing.module'
import { ProductsModule } from './products/products.module'
import { OrdersModule } from './orders/orders.module'
import { UsersModule } from './users/users.module'
import { AdminModule } from './admin/admin.module'
import { UploadsModule } from './uploads/uploads.module'
import { AuditLoggerModule } from './common/audit-logger.module'
import { SecurityModule } from './common/security.module'
import { MarketplaceModule } from './marketplace/marketplace.module'
import { SmartVaultModule } from './smart-vault/smart-vault.module'
import { GroupBuyingModule } from './group-buying/group-buying.module'
import { CommunityModule } from './community/community.module'
import { SubscriptionsModule } from './subscriptions/subscriptions.module'
import { NotificationsModule } from './notifications/notifications.module'
import { CustomBuilderModule } from './custom-builder/custom-builder.module'
import { AiEngineModule } from './ai-engine/ai-engine.module'
import { EscrowModule } from './escrow/escrow.module'
import { PaymentsModule } from './payments/payments.module'
import { CatalogModule } from './catalog/catalog.module'
import { CartModule } from './cart/cart.module'
import { WalletModule } from './wallet/wallet.module'
import { PricingModule } from './pricing/pricing.module'
import { LiquidityModule } from './liquidity/liquidity.module'
import { ArModule } from './ar/ar.module'
import { ContentModule } from './content/content.module'
import { AuditModule } from './audit/audit.module'
import { CommunityExtensionsModule } from './community-extensions/community-extensions.module'
import { AuthModule } from './auth/auth.module'
import { Role } from './auth/role.entity'
import { Permission } from './auth/permission.entity'
import { UserRoleMapping } from './auth/user-role-mapping.entity'
import { RolePermissionMapping } from './auth/role-permission-mapping.entity'

import { GoldPrice } from './gold-pricing/gold-price.entity'
import { PriceHistory } from './gold-pricing/price-history.entity'
import { Product } from './products/product.entity'
import { Order } from './orders/order.entity'
import { User } from './users/user.entity'
import { KycProfile } from './users/kyc-profile.entity'
import { OtpSession } from './users/otp-session.entity'
import { PublicProfile } from './users/public-profile.entity'
import { UserAddress } from './users/user-address.entity'
import { UserBankAccount } from './users/user-bank-account.entity'
import { UserProfile } from './users/user-profile.entity'
import { Auction } from './auctions/auction.entity'
import { AuctionBid } from './auctions/auction-bid.entity'
import { UsedGoldListing } from './marketplace/used-gold-listing.entity'
import { SmartVaultAsset } from './smart-vault/smart-vault-asset.entity'
import { AssetValuationSnapshot } from './smart-vault/asset-valuation-snapshot.entity'
import { PriceAlert } from './smart-vault/price-alert.entity'
import { GroupBuyingGroup } from './group-buying/group-buying-group.entity'
import { GroupBuyingItem } from './group-buying/group-buying-item.entity'
import { GroupBuyingMember } from './group-buying/group-buying-member.entity'
import { DesignChallenge } from './community/design-challenge.entity'
import { DesignPost } from './community/design-post.entity'
import { DesignComment } from './community/design-comment.entity'
import { DesignVote } from './community/design-vote.entity'
import { SubscriptionPlan } from './subscriptions/subscription-plan.entity'
import { UserSubscription } from './subscriptions/user-subscription.entity'
import { DiscountCode } from './subscriptions/discount-code.entity'
import { Notification } from './notifications/notification.entity'
import { JewelryDesign } from './custom-builder/jewelry-design.entity'
import { JewelryDesignVersion } from './custom-builder/jewelry-design-version.entity'
import { GemstoneLibrary } from './custom-builder/gemstone-library.entity'
import { CustomBuilderQuote } from './custom-builder/custom-builder-quote.entity'
import { AiPricePrediction } from './ai-engine/ai-price-prediction.entity'
import { AiDesignRecommendation } from './ai-engine/ai-design-recommendation.entity'
import { AiMarketMatch } from './ai-engine/ai-market-match.entity'
import { AiServiceMetric } from './ai-engine/ai-service-metric.entity'
import { EscrowPayment } from './escrow/escrow-payment.entity'
import { MarketplaceRating } from './escrow/marketplace-rating.entity'
import { PaymentTransaction } from './payments/payment-transaction.entity'
import { OrderTrackingEvent } from './payments/order-tracking-event.entity'
import { ProductCategoryMaster } from './catalog/product-category-master.entity'
import { OccasionCategory } from './catalog/occasion-category.entity'
import { ProductMedia } from './catalog/product-media.entity'
import { Stone } from './catalog/stone.entity'
import { ProductStone } from './catalog/product-stone.entity'
import { Inventory } from './catalog/inventory.entity'
import { SellerProfile } from './catalog/seller-profile.entity'
import { Cart } from './cart/cart.entity'
import { CartItem } from './cart/cart-item.entity'
import { Wallet } from './wallet/wallet.entity'
import { WalletTransaction } from './wallet/wallet-transaction.entity'
import { PayoutRequest } from './wallet/payout-request.entity'
import { PricingRule } from './pricing/pricing-rule.entity'
import { PricingSpread } from './pricing/pricing-spread.entity'
import { TaxRule } from './pricing/tax-rule.entity'
import { LaborCostRule } from './pricing/labor-cost-rule.entity'
import { LiquidityRequest } from './liquidity/liquidity-request.entity'
import { SellRecommendation } from './liquidity/sell-recommendation.entity'
import { BuyerRequest } from './liquidity/buyer-request.entity'
import { ArModel } from './ar/ar-model.entity'
import { ArPreview } from './ar/ar-preview.entity'
import { ContentPage } from './content/content-page.entity'
import { Promotion } from './content/promotion.entity'
import { AdCampaign } from './content/ad-campaign.entity'
import { AuditLog } from './audit/audit-log.entity'
import { EventLog } from './audit/event-log.entity'
import { SystemSetting } from './audit/system-setting.entity'
import { NotificationPreference } from './audit/notification-preference.entity'
import { UserFollow } from './community-extensions/user-follow.entity'
import { DesignSave } from './community-extensions/design-save.entity'
import { UserBadge } from './community-extensions/user-badge.entity'
import { ChallengeReward } from './community-extensions/challenge-reward.entity'
import { OrderStatusHistory } from './orders/order-status-history.entity'
import { Shipment } from './orders/shipment.entity'
import { Invoice } from './orders/invoice.entity'
import { Refund } from './orders/refund.entity'
import { OrderCancellation } from './orders/order-cancellation.entity'
import { PlatformRevenue } from './finance/platform-revenue.entity'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.ai'],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_DATABASE || 'goldeksa',
      entities: [
        GoldPrice,
        PriceHistory,
        Product,
        Order,
        User,
        KycProfile,
        OtpSession,
        Role,
        Permission,
        UserRoleMapping,
        RolePermissionMapping,
        PublicProfile,
        UserAddress,
        UserBankAccount,
        UserProfile,
        Auction,
        AuctionBid,
        UsedGoldListing,
        SmartVaultAsset,
        AssetValuationSnapshot,
        PriceAlert,
        GroupBuyingGroup,
        GroupBuyingItem,
        GroupBuyingMember,
        DesignChallenge,
        DesignPost,
        DesignComment,
        DesignVote,
        SubscriptionPlan,
        UserSubscription,
        DiscountCode,
        Notification,
        JewelryDesign,
        JewelryDesignVersion,
        GemstoneLibrary,
        CustomBuilderQuote,
        AiPricePrediction,
        AiDesignRecommendation,
        AiMarketMatch,
        AiServiceMetric,
        EscrowPayment,
        MarketplaceRating,
        PaymentTransaction,
        OrderTrackingEvent,
        ProductCategoryMaster,
        OccasionCategory,
        ProductMedia,
        Stone,
        ProductStone,
        Inventory,
        SellerProfile,
        Cart,
        CartItem,
        Wallet,
        WalletTransaction,
        PayoutRequest,
        PricingRule,
        PricingSpread,
        TaxRule,
        LaborCostRule,
        LiquidityRequest,
        SellRecommendation,
        BuyerRequest,
        ArModel,
        ArPreview,
        ContentPage,
        Promotion,
        AdCampaign,
        AuditLog,
        EventLog,
        SystemSetting,
        NotificationPreference,
        UserFollow,
        DesignSave,
        UserBadge,
        ChallengeReward,
        OrderStatusHistory,
        Shipment,
        Invoice,
        Refund,
        OrderCancellation,
        PlatformRevenue,
      ],
      synchronize: false,
      logging: process.env.NODE_ENV === 'development',
    }),
    ScheduleModule.forRoot(),
    RedisModule,
    AuctionsModule,
    MarketplaceModule,
    SmartVaultModule,
    GroupBuyingModule,
    CommunityModule,
    SubscriptionsModule,
    NotificationsModule,
    CustomBuilderModule,
    AiEngineModule,
    EscrowModule,
    PaymentsModule,
    CatalogModule,
    CartModule,
    WalletModule,
    PricingModule,
    LiquidityModule,
    ArModule,
    ContentModule,
    AuditModule,
    CommunityExtensionsModule,
    AuthModule,
    GoldPricingModule,
    ProductsModule,
    OrdersModule,
    UsersModule,
    AdminModule,
    UploadsModule,
    AuditLoggerModule,
    SecurityModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
