import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, Repository } from 'typeorm'
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
import { User } from '../users/user.entity'
import { WalletService } from '../wallet/wallet.service'

@Injectable()
export class GroupBuyingService {
  constructor(
    @InjectRepository(GroupBuyingGroup)
    private groupRepository: Repository<GroupBuyingGroup>,
    @InjectRepository(GroupBuyingItem)
    private itemRepository: Repository<GroupBuyingItem>,
    @InjectRepository(GroupBuyingMember)
    private memberRepository: Repository<GroupBuyingMember>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly walletService: WalletService,
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
    const leader = await this.userRepository.findOneBy({ id: data.leaderId })
    if (!leader) throw new NotFoundException('رهبر گروه یافت نشد')
    const group = this.groupRepository.create({
      leaderId: data.leaderId,
      leaderName: leader.name,
      title: data.title,
      paymentMode: data.paymentMode || GroupBuyingPaymentMode.MEMBER,
      targetAmount: data.targetAmount || 0,
      discountRate: data.discountRate || 0,
      inviteCode: this.createInviteCode(),
      status: GroupBuyingStatus.OPEN,
    })

    return this.groupRepository.save(group)
  }

  async addItem(groupId: string, data: AddGroupBuyingItemDto, actorId: string): Promise<GroupBuyingItem> {
    const group = await this.groupRepository.findOneBy({ id: groupId })

    if (!group) {
      throw new NotFoundException('گروه خرید یافت نشد')
    }
    if (group.leaderId !== actorId) throw new ForbiddenException('فقط رهبر گروه می‌تواند محصول اضافه کند')
    if (!Number.isFinite(Number(data.unitPrice)) || Number(data.unitPrice) <= 0 || !Number.isInteger(Number(data.quantity || 1)) || Number(data.quantity || 1) < 1) {
      throw new BadRequestException('مقدار و قیمت محصول نامعتبر است')
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
    if (group.status !== GroupBuyingStatus.OPEN) throw new BadRequestException('این گروه در حال پذیرش عضو نیست')
    if (!Number.isFinite(Number(data.shareAmount)) || Number(data.shareAmount) <= 0) throw new BadRequestException('سهم مالی نامعتبر است')
    const existing = await this.memberRepository.findOneBy({ groupId, userId: data.userId })
    if (existing) return existing
    const user = await this.userRepository.findOneBy({ id: data.userId })
    if (!user) throw new NotFoundException('کاربر یافت نشد')

    const member = this.memberRepository.create({
      groupId,
      userId: data.userId,
      userName: user.name,
      shareAmount: data.shareAmount,
      status: GroupBuyingMemberStatus.JOINED,
    })

    return this.memberRepository.save(member)
  }

  async payShare(
    groupId: string,
    memberId: string,
    data: PayGroupBuyingShareDto,
    actorId: string,
  ): Promise<GroupBuyingMember> {
    return this.dataSource.transaction(async (manager) => {
      const member = await manager.findOne(GroupBuyingMember, { where: { id: memberId, groupId }, lock: { mode: 'pessimistic_write' } })
      if (!member) throw new NotFoundException('عضو گروه خرید یافت نشد')
      if (member.userId !== actorId) throw new ForbiddenException('فقط صاحب سهم می‌تواند پرداخت خود را ثبت کند')
      const requested = Number(data.paidAmount)
      const previous = Number(member.paidAmount || 0)
      if (!Number.isFinite(requested) || requested < previous || requested > Number(member.shareAmount)) {
        throw new BadRequestException('مبلغ پرداختی نامعتبر است')
      }
      const delta = requested - previous
      if (delta > 0) await this.walletService.payGroupBuyingShare(actorId, member.id, delta, manager)
      member.paidAmount = requested
      member.status = requested >= Number(member.shareAmount) ? GroupBuyingMemberStatus.PAID : GroupBuyingMemberStatus.JOINED
      return manager.save(member)
    })
  }

  private createInviteCode(): string {
    return `GX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }
}
