import { GroupBuyingPaymentMode } from './group-buying-group.entity'

export class CreateGroupBuyingGroupDto {
  leaderId: string
  leaderName: string
  title: string
  paymentMode?: GroupBuyingPaymentMode
  targetAmount?: number
  discountRate?: number
}

export class AddGroupBuyingItemDto {
  productId: string
  name: string
  quantity?: number
  unitPrice: number
}

export class JoinGroupBuyingDto {
  userId: string
  userName: string
  shareAmount: number
}

export class PayGroupBuyingShareDto {
  paidAmount: number
}
