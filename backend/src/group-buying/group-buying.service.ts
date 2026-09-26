import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common'
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
import { Order, OrderStatus, PaymentMethod } from '../orders/order.entity'
import { Shipment } from '../orders/shipment.entity'
import { OrderStatusHistory } from '../orders/order-status-history.entity'
import { Product } from '../products/product.entity'
import { CreateOrderAddressDto } from '../orders/create-order.dto'
import { PricingService } from '../pricing/pricing.service'
import { randomUUID } from 'crypto'

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
    @Optional() private readonly pricingService?: PricingService,
    @Optional() @InjectRepository(Order) private readonly orderRepository?: Repository<Order>,
    @Optional() @InjectRepository(Shipment) private readonly shipmentRepository?: Repository<Shipment>,
    @Optional() @InjectRepository(OrderStatusHistory) private readonly statusHistoryRepository?: Repository<OrderStatusHistory>,
  ) {}

  async getTracking(groupId: string, actorId: string, isAdmin = false): Promise<{
    orderId: string | null
    orderStatus: OrderStatus | null
    trackingCode: string | null
    shipments: Shipment[]
    history: OrderStatusHistory[]
  }> {
    const group = await this.groupRepository.findOneBy({ id: groupId })
    if (!group) throw new NotFoundException('گروه خرید یافت نشد')
    if (!isAdmin && group.leaderId !== actorId) {
      const member = await this.memberRepository.findOneBy({ groupId, userId: actorId })
      if (!member) throw new ForbiddenException('دسترسی به رهگیری این گروه مجاز نیست')
    }
    if (!group.orderId) return { orderId: null, orderStatus: null, trackingCode: null, shipments: [], history: [] }
    if (!this.orderRepository || !this.shipmentRepository || !this.statusHistoryRepository) {
      throw new BadRequestException('سرویس رهگیری سفارش در دسترس نیست')
    }
    const [order, shipments, history] = await Promise.all([
      this.orderRepository.findOneBy({ id: group.orderId }),
      this.shipmentRepository.find({ where: { orderId: group.orderId }, order: { createdAt: 'DESC' } }),
      this.statusHistoryRepository.find({ where: { orderId: group.orderId }, order: { createdAt: 'ASC' } }),
    ])
    if (!order) throw new NotFoundException('سفارش گروهی یافت نشد')
    return {
      orderId: order.id,
      orderStatus: order.status,
      trackingCode: order.trackingCode,
      shipments,
      history,
    }
  }

  async findAll(actorId?: string, isAdmin = false): Promise<GroupBuyingGroup[]> {
    const groups = await this.groupRepository.find({ order: { createdAt: 'DESC' } })
    return Promise.all(groups.map(async (group) => {
      if (isAdmin || group.leaderId === actorId) return group
      const isMember = actorId
        ? Boolean(await this.memberRepository.findOneBy({ groupId: group.id, userId: actorId }))
        : false
      return isMember ? group : { ...group, inviteCode: '' }
    }))
  }

  async findOne(id: string, actorId?: string, isAdmin = false): Promise<{
    group: GroupBuyingGroup
    items: GroupBuyingItem[]
    members: GroupBuyingMember[]
  } | null> {
    const group = await this.groupRepository.findOneBy({ id })

    if (!group) {
      return null
    }

    const isLeader = actorId === group.leaderId
    const isMember = actorId
      ? Boolean(await this.memberRepository.findOneBy({ groupId: id, userId: actorId }))
      : false
    if (!isAdmin && !isLeader && !isMember && group.status !== GroupBuyingStatus.OPEN) {
      throw new ForbiddenException('دسترسی به جزئیات این گروه مجاز نیست')
    }

    const [items, members] = await Promise.all([
      this.itemRepository.findBy({ groupId: id }),
      isAdmin || isLeader || isMember ? this.memberRepository.findBy({ groupId: id }) : Promise.resolve([]),
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
      orderId: null,
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
    if (group.status !== GroupBuyingStatus.OPEN) throw new BadRequestException('این گروه دیگر قابل ویرایش نیست')
    if (!Number.isFinite(Number(data.unitPrice)) || Number(data.unitPrice) <= 0 || !Number.isInteger(Number(data.quantity || 1)) || Number(data.quantity || 1) < 1) {
      throw new BadRequestException('مقدار و قیمت محصول نامعتبر است')
    }

    const product = await this.itemRepository.manager.findOne(Product, { where: { id: data.productId } })
    if (!product) throw new NotFoundException('محصول یافت نشد')
    if (!this.pricingService) throw new BadRequestException('سرویس قیمت‌گذاری در دسترس نیست')
    const livePrice = await this.pricingService.calculateProductPrice(product)

    const item = this.itemRepository.create({
      groupId,
      productId: product.id,
      name: product.name,
      quantity: data.quantity || 1,
      unitPrice: livePrice,
      totalPrice: Number(livePrice) * Number(data.quantity || 1),
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

  async finalizeGroup(groupId: string, address: CreateOrderAddressDto, actorId: string): Promise<Order> {
    return this.dataSource.transaction(async (manager) => {
      const group = await manager.findOne(GroupBuyingGroup, {
        where: { id: groupId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!group) throw new NotFoundException('گروه خرید یافت نشد')
      if (group.leaderId !== actorId) throw new ForbiddenException('فقط رهبر گروه می‌تواند خرید را نهایی کند')
      if (group.orderId) {
        const existing = await manager.findOne(Order, { where: { id: group.orderId } })
        if (existing) return existing
      }
      if (group.status !== GroupBuyingStatus.OPEN) throw new BadRequestException('این گروه قابل نهایی‌سازی نیست')

      const [items, members] = await Promise.all([
        manager.find(GroupBuyingItem, { where: { groupId } }),
        manager.find(GroupBuyingMember, { where: { groupId }, lock: { mode: 'pessimistic_write' } }),
      ])
      if (!items.length || !members.length) throw new BadRequestException('گروه هنوز محصول یا عضو ندارد')

      const goodsTotal = items.reduce((sum, item) => sum + Number(item.totalPrice), 0)
      const discount = Math.min(Math.max(Number(group.discountRate || 0), 0), 99.99)
      const totalAmount = Math.round(goodsTotal * (1 - discount / 100) * 100) / 100
      const paidTotal = members.reduce((sum, member) => sum + Number(member.paidAmount || 0), 0)
      if (paidTotal < totalAmount || members.some((member) => Number(member.paidAmount || 0) < Number(member.shareAmount))) {
        throw new BadRequestException('همه سهم‌ها هنوز به طور کامل پرداخت نشده‌اند')
      }

      const productIds = [...new Set(items.map((item) => item.productId))].sort()
      const products = new Map<string, Product>()
      for (const productId of productIds) {
        const product = await manager.findOne(Product, { where: { id: productId }, lock: { mode: 'pessimistic_write' } })
        if (!product) throw new NotFoundException(`محصول ${productId} یافت نشد`)
        products.set(productId, product)
      }
      for (const item of items) {
        const product = products.get(item.productId)!
        if (product.stock < item.quantity) throw new BadRequestException(`موجودی محصول ${product.name} کافی نیست`)
        product.stock -= item.quantity
        await manager.save(product)
      }

      const order = manager.create(Order, {
        orderNumber: `GX-${randomUUID().replace(/-/g, '').slice(0, 24)}`,
        userId: group.leaderId,
        items: items.map((item) => ({ productId: item.productId, name: item.name, quantity: item.quantity, unitPrice: item.unitPrice, totalPrice: item.totalPrice })),
        totalAmount,
        shippingCost: 0,
        status: OrderStatus.PAID,
        address,
        paymentMethod: PaymentMethod.WALLET,
        groupBuyingId: group.id,
      })
      const saved = await manager.save(order)
      group.orderId = saved.id
      group.status = GroupBuyingStatus.PAID
      await manager.save(group)
      return saved
    })
  }

  async cancelGroup(groupId: string, actorId: string): Promise<GroupBuyingGroup> {
    return this.dataSource.transaction(async (manager) => {
      const group = await manager.findOne(GroupBuyingGroup, {
        where: { id: groupId },
        lock: { mode: 'pessimistic_write' },
      })
      if (!group) throw new NotFoundException('گروه خرید یافت نشد')
      if (group.leaderId !== actorId) throw new ForbiddenException('فقط رهبر گروه می‌تواند گروه را لغو کند')
      if (group.status === GroupBuyingStatus.CANCELLED) return group
      if (group.status !== GroupBuyingStatus.OPEN || group.orderId) {
        throw new BadRequestException('گروه پس از نهایی‌سازی قابل لغو نیست')
      }

      const members = await manager.find(GroupBuyingMember, {
        where: { groupId },
        lock: { mode: 'pessimistic_write' },
      })
      for (const member of members) {
        const paidAmount = Number(member.paidAmount || 0)
        if (paidAmount > 0) {
          await this.walletService.refundGroupBuyingShare(member.userId, member.id, paidAmount, manager)
        }
        member.paidAmount = 0
        member.status = GroupBuyingMemberStatus.LEFT
        await manager.save(member)
      }
      group.status = GroupBuyingStatus.CANCELLED
      return manager.save(group)
    })
  }

  private createInviteCode(): string {
    return `GX-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
  }
}
