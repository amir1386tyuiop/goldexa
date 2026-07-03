import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SubscriptionPlan } from './subscription-plan.entity'
import { UserSubscription } from './user-subscription.entity'
import { DiscountCode } from './discount-code.entity'
import { SubscriptionsController } from './subscriptions.controller'
import { SubscriptionsService } from './subscriptions.service'

@Module({
  imports: [TypeOrmModule.forFeature([SubscriptionPlan, UserSubscription, DiscountCode])],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
