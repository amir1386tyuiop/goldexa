import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { SubscriptionsService } from './subscriptions.service'
import {
  CreateDiscountCodeDto,
  CreateSubscriptionPlanDto,
  CreateUserSubscriptionDto,
} from './create-subscription.dto'

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  async findPlans() {
    return this.subscriptionsService.findPlans()
  }

  @Post('plans')
  async createPlan(@Body() body: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(body)
  }

  @Get('users/:userId')
  async findUserSubscriptions(@Param('userId') userId: string) {
    return this.subscriptionsService.findUserSubscriptions(userId)
  }

  @Post('users')
  async createUserSubscription(@Body() body: CreateUserSubscriptionDto) {
    return this.subscriptionsService.createUserSubscription(body)
  }

  @Get('discounts')
  async findDiscounts() {
    return this.subscriptionsService.findDiscounts()
  }

  @Post('discounts')
  async createDiscount(@Body() body: CreateDiscountCodeDto) {
    return this.subscriptionsService.createDiscount(body)
  }
}
