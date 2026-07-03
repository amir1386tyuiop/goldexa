import { DiscountType } from './discount-code.entity'
import { SubscriptionPlanLevel } from './subscription-plan.entity'
import { UserSubscriptionStatus } from './user-subscription.entity'

export class CreateSubscriptionPlanDto {
  name: string
  level?: SubscriptionPlanLevel
  price?: number
  durationDays?: number
  features?: string[] | null
  isActive?: boolean
}

export class CreateUserSubscriptionDto {
  userId: string
  planId: string
  startDate: Date
  endDate: Date
  status?: UserSubscriptionStatus
}

export class CreateDiscountCodeDto {
  code: string
  description?: string | null
  discountType?: DiscountType
  discountValue?: number
  minPurchase?: number
  expiresAt?: Date | null
  isActive?: boolean
}
