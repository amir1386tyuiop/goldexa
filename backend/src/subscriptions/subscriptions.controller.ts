import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createPlan(@Body() body: CreateSubscriptionPlanDto) {
    return this.subscriptionsService.createPlan(body)
  }

  @Get('users/:userId')
  @UseGuards(JwtAuthGuard)
  async findUserSubscriptions(@Req() req: Request & { user: JwtUser }) {
    return this.subscriptionsService.findUserSubscriptions(req.user.sub)
  }

  @Post('users')
  @UseGuards(JwtAuthGuard)
  async createUserSubscription(@Body() body: CreateUserSubscriptionDto, @Req() req: Request & { user: JwtUser }) {
    return this.subscriptionsService.createUserSubscription({ ...body, userId: req.user.sub })
  }

  @Get('discounts')
  async findDiscounts() {
    return this.subscriptionsService.findDiscounts()
  }

  @Post('discounts')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createDiscount(@Body() body: CreateDiscountCodeDto) {
    return this.subscriptionsService.createDiscount(body)
  }
}
