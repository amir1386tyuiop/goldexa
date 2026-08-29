import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Auction } from '../auctions/auction.entity'
import { UsedGoldListing } from '../marketplace/used-gold-listing.entity'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'
import { PriceAlert } from '../smart-vault/price-alert.entity'
import { SubscriptionPlan } from '../subscriptions/subscription-plan.entity'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'
import { Order } from '../orders/order.entity'
import { OrderStatusHistory } from '../orders/order-status-history.entity'
import { Refund } from '../orders/refund.entity'
import { User } from '../users/user.entity'
import { Product } from '../products/product.entity'
import { GoldPrice } from '../gold-pricing/gold-price.entity'
import { JewelryDesign } from '../custom-builder/jewelry-design.entity'
import { ProductCategoryMaster } from '../catalog/product-category-master.entity'
import { Cart } from '../cart/cart.entity'
import { CartItem } from '../cart/cart-item.entity'
import { Wallet } from '../wallet/wallet.entity'
import { PricingRule } from '../pricing/pricing-rule.entity'
import { LiquidityRequest } from '../liquidity/liquidity-request.entity'
import { ArModel } from '../ar/ar-model.entity'
import { ContentPage } from '../content/content-page.entity'
import { AuditLog } from '../audit/audit-log.entity'
import { SystemSetting } from '../audit/system-setting.entity'
import { UserFollow } from '../community-extensions/user-follow.entity'
import { AiPricePrediction } from '../ai-engine/ai-price-prediction.entity'
import { EscrowPayment } from '../escrow/escrow-payment.entity'
import { PaymentTransaction } from '../payments/payment-transaction.entity'
import { Role } from '../auth/role.entity'
import { Permission } from '../auth/permission.entity'
import { UserRoleMapping } from '../auth/user-role-mapping.entity'
import { RolePermissionMapping } from '../auth/role-permission-mapping.entity'
import { RoleService } from '../auth/role.service'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    TypeOrmModule.forFeature([
      Order,
      OrderStatusHistory,
      Refund,
      User,
      Product,
      GoldPrice,
      Auction,
      UsedGoldListing,
      SmartVaultAsset,
      PriceAlert,
      SubscriptionPlan,
      JewelryDesign,
      AiPricePrediction,
      EscrowPayment,
      PaymentTransaction,
      ProductCategoryMaster,
      Cart,
      CartItem,
      Wallet,
      PricingRule,
      LiquidityRequest,
      ArModel,
      ContentPage,
      AuditLog,
      SystemSetting,
      UserFollow,
      Role,
      Permission,
      UserRoleMapping,
      RolePermissionMapping,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, RoleService],
})
export class AdminModule {}
