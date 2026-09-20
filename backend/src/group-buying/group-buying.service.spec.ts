import { ForbiddenException } from '@nestjs/common'
import { GroupBuyingService } from './group-buying.service'
import { GroupBuyingStatus } from './group-buying-group.entity'

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
})
