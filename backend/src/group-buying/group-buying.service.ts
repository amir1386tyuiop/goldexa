import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  GroupBuyingGroup,
  GroupBuyingMemberStatus,
  GroupBuyingPaymentMode,
  GroupBuyingStatus,
} from './group-buying-group.entity'
import { GroupBuyingItem } from './group-buying-item.entity'
import { GroupBuyingMember } from './group-buying-member.entity'
import {
  AddGroupBuyingItemDto,
  CreateGroupBuyingGroupDto,
  JoinGroupBuyingDto,
  PayGroupBuyingShareDto,
} from './create-group-buying.dto'

@Injectable()
export class GroupBuyingService {
  constructor(
    @InjectRepository(GroupBuyingGroup)
    private groupRepository: Repository<GroupBuyingGroup>,
    @InjectRepository(GroupBuyingItem)
    private itemRepository: Repository<GroupBuyingItem>,
    @InjectRepository(GroupBuyingMember)
    private memberRepository: Repository<GroupBuyingMember>,
  ) {}

  async findAll(): Promise<GroupBuyingGroup[]> {
    return this.groupRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(id: string): Promise<{
    group: GroupBuyingGroup
    items: GroupBuyingItem[]
    members: GroupBuyingMember[]
  } | null> {
    const group = await this.groupRepository.findOneBy({ id })

    if (!group) {
      return null
    }

    const [items, members] = await Promise.all([
      this.itemRepository.findBy({ groupId: id }),
      this.memberRepository.findBy({ groupId: id }),
    ])

    return { group, items, members }
  }

  async createGroup(data: CreateGroupBuyingGroupDto): Promise<GroupBuyingGroup> {
    const group = this.groupRepository.create({
      leaderId: data.leaderId,
      leaderName: data.leaderName,
      title: data.title,
      paymentMode: data.paymentMode || GroupBuyingPaymentMode.MEMBER,
      targetAmount: data.targetAmount || 0,
      discountRate: data.discountRate || 0,
      inviteCode: this.createInviteCode(),
      status: GroupBuyingStatus.OPEN,
    })

    return this.groupRepository.save(group)
  }

  async addItem(groupId: string, data: AddGroupBuyingItemDto): Promise<GroupBuyingItem> {
    const group = await this.groupRepository.findOneBy({ id: groupId })

    if (!group) {
      throw new NotFoundException('گروه خرید یافت نشد')
    }

    const item = this.itemRepository.create({
      groupId,
      productId: data.productId,
      name: data.name,
      quantity: data.quantity || 1,
      unitPrice: data.unitPrice,
      totalPrice: Number(data.unitPrice) * Number(data.quantity || 1),
    })

    return this.itemRepository.save(item)
  }

  async join(groupId: string, data: JoinGroupBuyingDto): Promise<GroupBuyingMember> {
    const group = await this.groupRepository.findOneBy({ id: groupId })

    if (!group) {
      throw new NotFoundException('گروه خرید یافت نشد')
    }

    const member = this.memberRepository.create({
      groupId,
      userId: data.userId,
      userName: data.userName,
      shareAmount: data.shareAmount,
      status: GroupBuyingMemberStatus.JOINED,
    })

    return this.memberRepository.save(member)
  }

  async payShare(
    groupId: string,
    memberId: string,
    data: PayGroupBuyingShareDto,
  ): Promise<GroupBuyingMember> {
    const member = await this.memberRepository.findOneBy({ id: memberId, groupId })

    if (!member) {
      throw new NotFoundException('عضو گروه خرید یافت نشد')
    }

    member.paidAmount = data.paidAmount
    member.status =
      Number(member.paidAmount) >= Number(member.shareAmount)
        ? GroupBuyingMemberStatus.PAID
        : GroupBuyingMemberStatus.JOINED

    return this.memberRepository.save(member)
  }

  private createInviteCode(): string {
    return `GX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }
}
