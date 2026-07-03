import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SubscriptionPlan, SubscriptionPlanLevel } from './subscription-plan.entity'
import { UserSubscription, UserSubscriptionStatus } from './user-subscription.entity'
import { DiscountCode, DiscountType } from './discount-code.entity'
import {
  CreateDiscountCodeDto,
  CreateSubscriptionPlanDto,
  CreateUserSubscriptionDto,
} from './create-subscription.dto'

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(SubscriptionPlan)
    private planRepository: Repository<SubscriptionPlan>,
    @InjectRepository(UserSubscription)
    private userSubscriptionRepository: Repository<UserSubscription>,
    @InjectRepository(DiscountCode)
    private discountRepository: Repository<DiscountCode>,
  ) {}

  async findPlans(): Promise<SubscriptionPlan[]> {
    return this.planRepository.findBy({ isActive: true })
  }

  async createPlan(data: CreateSubscriptionPlanDto): Promise<SubscriptionPlan> {
    return this.planRepository.save(
      this.planRepository.create({
        ...data,
        level: data.level || SubscriptionPlanLevel.SILVER,
        price: data.price ?? 0,
        durationDays: data.durationDays ?? 30,
        features: data.features ?? null,
        isActive: data.isActive ?? true,
      }) as SubscriptionPlan,
    )
  }

  async findUserSubscriptions(userId: string): Promise<UserSubscription[]> {
    return this.userSubscriptionRepository.findBy({ userId })
  }

  async createUserSubscription(data: CreateUserSubscriptionDto): Promise<UserSubscription> {
    return this.userSubscriptionRepository.save(
      this.userSubscriptionRepository.create({
        ...data,
        status: data.status || UserSubscriptionStatus.ACTIVE,
      }) as UserSubscription,
    )
  }

  async findDiscounts(): Promise<DiscountCode[]> {
    return this.discountRepository.findBy({ isActive: true })
  }

  async createDiscount(data: CreateDiscountCodeDto): Promise<DiscountCode> {
    return this.discountRepository.save(
      this.discountRepository.create({
        ...data,
        discountType: data.discountType || DiscountType.PERCENT,
        discountValue: data.discountValue ?? 0,
        minPurchase: data.minPurchase ?? 0,
        expiresAt: data.expiresAt ?? null,
        isActive: data.isActive ?? true,
      }) as DiscountCode,
    )
  }
}
