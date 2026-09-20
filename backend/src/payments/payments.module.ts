import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PaymentsController } from './payments.controller'
import { PaymentsService } from './payments.service'
import { ZarinpalService } from './zarinpal.service'
import { OrderTrackingEvent } from './order-tracking-event.entity'
import { PaymentTransaction } from './payment-transaction.entity'
import { Order } from '../orders/order.entity'
import { PricingModule } from '../pricing/pricing.module'

@Module({
  imports: [TypeOrmModule.forFeature([PaymentTransaction, OrderTrackingEvent, Order]), PricingModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, ZarinpalService],
  exports: [PaymentsService, ZarinpalService],
})
export class PaymentsModule {}
