import { ForbiddenException } from '@nestjs/common'
import { GroupBuyingService } from './group-buying.service'
import { GroupBuyingStatus } from './group-buying-group.entity'
import { OrderStatus } from '../orders/order.entity'

describe('GroupBuyingService ownership rules', () => {
  it('uses the authenticated leader name instead of client input', async () => {
    const groups = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    const users = { findOneBy: jest.fn().mockResolvedValue({ id: 'leader-1', name: 'نام واقعی' }) }
    const service = new GroupBuyingService(groups as never, {} as never, {} as never, users as never, {} as never, {} as never)

    await expect(service.createGroup({ leaderId: 'leader-1', leaderName: 'نام جعلی', title: 'گروه' })).resolves.toEqual(expect.objectContaining({ leaderName: 'نام واقعی', status: GroupBuyingStatus.OPEN }))
  })

  it('rejects adding items by a non-leader', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1' }) }
    const service = new GroupBuyingService(groups as never, {} as never, {} as never, {} as never, {} as never, {} as never)

    await expect(service.addItem('group-1', { productId: 'p1', name: 'طلا', unitPrice: 100 }, 'attacker')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('creates one paid order and locks inventory when every member has paid', async () => {
    const group = { id: 'group-1', leaderId: 'leader-1', status: GroupBuyingStatus.OPEN, orderId: null, discountRate: 10 }
    const item = { id: 'item-1', groupId: 'group-1', productId: 'product-1', name: 'انگشتر', quantity: 1, unitPrice: 1000, totalPrice: 1000 }
    const member = { id: 'member-1', groupId: 'group-1', userId: 'buyer-1', shareAmount: 900, paidAmount: 900, status: 'paid' }
    const product = { id: 'product-1', name: 'انگشتر', stock: 2 }
    const manager = {
      findOne: jest.fn()
        .mockResolvedValueOnce(group)
        .mockResolvedValueOnce(product),
      find: jest.fn()
        .mockResolvedValueOnce([item])
        .mockResolvedValueOnce([member]),
      create: jest.fn((_entity, value) => value),
      save: jest.fn(async (value) => value.id ? value : { ...value, id: 'order-1' }),
    }
    const dataSource = { transaction: jest.fn(async (callback) => callback(manager)) }
    const service = new GroupBuyingService({} as never, {} as never, {} as never, {} as never, dataSource as never, {} as never)

    const order = await service.finalizeGroup('group-1', { title: 'خانه', province: 'تهران', city: 'تهران', street: 'خیابان اصلی', postalCode: '1234567890', isDefault: true }, 'leader-1')

    expect(order).toEqual(expect.objectContaining({ id: 'order-1', totalAmount: 900, status: 'paid', userId: 'leader-1' }))
    expect(product.stock).toBe(1)
    expect(group.status).toBe(GroupBuyingStatus.PAID)
    expect(group.orderId).toBe('order-1')
  })

  it('refunds each paid share exactly once when the leader cancels an open group', async () => {
    const group = { id: 'group-1', leaderId: 'leader-1', status: GroupBuyingStatus.OPEN, orderId: null }
    const members = [{ id: 'member-1', groupId: 'group-1', userId: 'buyer-1', paidAmount: 500, status: 'paid' }]
    const manager = {
      findOne: jest.fn().mockResolvedValue(group),
      find: jest.fn().mockResolvedValue(members),
      save: jest.fn(async (value) => value),
    }
    const walletService = { refundGroupBuyingShare: jest.fn().mockResolvedValue({ id: 'refund-1' }) }
    const dataSource = { transaction: jest.fn(async (callback) => callback(manager)) }
    const service = new GroupBuyingService({} as never, {} as never, {} as never, {} as never, dataSource as never, walletService as never)

    await expect(service.cancelGroup('group-1', 'leader-1')).resolves.toEqual(expect.objectContaining({ status: GroupBuyingStatus.CANCELLED }))
    expect(walletService.refundGroupBuyingShare).toHaveBeenCalledWith('buyer-1', 'member-1', 500, manager)
    expect(members[0].paidAmount).toBe(0)
    expect(members[0].status).toBe('left')
  })

  it('returns group order tracking to a member', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1', orderId: 'order-1' }) }
    const members = { findOneBy: jest.fn().mockResolvedValue({ id: 'member-1', groupId: 'group-1', userId: 'member-1' }) }
    const orders = { findOneBy: jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.SHIPPED, trackingCode: 'TRK-1' }) }
    const shipments = { find: jest.fn().mockResolvedValue([{ id: 'shipment-1', orderId: 'order-1', carrier: 'پست', trackingCode: 'TRK-1' }]) }
    const history = { find: jest.fn().mockResolvedValue([{ id: 'history-1', orderId: 'order-1', status: 'shipped' }]) }
    const service = new GroupBuyingService(groups as never, {} as never, members as never, {} as never, {} as never, {} as never, {} as never, orders as never, shipments as never, history as never)

    await expect(service.getTracking('group-1', 'member-1')).resolves.toEqual(expect.objectContaining({ orderId: 'order-1', orderStatus: OrderStatus.SHIPPED, trackingCode: 'TRK-1' }))
    expect(shipments.find).toHaveBeenCalledWith({ where: { orderId: 'order-1' }, order: { createdAt: 'DESC' } })
  })

  it('denies group tracking to a non-member', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1', orderId: 'order-1' }) }
    const members = { findOneBy: jest.fn().mockResolvedValue(null) }
    const service = new GroupBuyingService(groups as never, {} as never, members as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never, {} as never)

    await expect(service.getTracking('group-1', 'attacker')).rejects.toBeInstanceOf(ForbiddenException)
  })

  it('hides group members from a non-member while the group is open', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1', status: GroupBuyingStatus.OPEN }) }
    const items = { findBy: jest.fn().mockResolvedValue([{ id: 'item-1' }]) }
    const members = { findOneBy: jest.fn().mockResolvedValue(null), findBy: jest.fn().mockResolvedValue([{ id: 'member-1' }]) }
    const service = new GroupBuyingService(groups as never, items as never, members as never, {} as never, {} as never, {} as never)

    const result = await service.findOne('group-1', 'outsider')

    expect(result?.items).toHaveLength(1)
    expect(result?.members).toEqual([])
    expect(members.findBy).not.toHaveBeenCalled()
  })

  it('denies closed group details to an outsider', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1', status: GroupBuyingStatus.PAID }) }
    const members = { findOneBy: jest.fn().mockResolvedValue(null) }
    const service = new GroupBuyingService(groups as never, {} as never, members as never, {} as never, {} as never, {} as never)

    await expect(service.findOne('group-1', 'outsider')).rejects.toBeInstanceOf(ForbiddenException)
  })
})
