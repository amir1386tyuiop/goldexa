import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Order } from './order.entity'
import { Product } from '../products/product.entity'
import { User } from '../users/user.entity'
import { OrdersService } from './orders.service'
import { OrdersController } from './orders.controller'
import { OrderCancellation } from './order-cancellation.entity'
import { Invoice } from './invoice.entity'
import { OrderStatusHistory } from './order-status-history.entity'
import { Refund } from './refund.entity'
import { Shipment } from './shipment.entity'
import { WalletModule } from '../wallet/wallet.module'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, Product, User, OrderCancellation, Invoice, OrderStatusHistory, Refund, Shipment]),
    WalletModule,
    PricingModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
