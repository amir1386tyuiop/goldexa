import { ForbiddenException } from '@nestjs/common'
import { GroupBuyingService } from './group-buying.service'
import { GroupBuyingStatus } from './group-buying-group.entity'

describe('GroupBuyingService ownership rules', () => {
  it('uses the authenticated leader name instead of client input', async () => {
    const groups = { create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    const users = { findOneBy: jest.fn().mockResolvedValue({ id: 'leader-1', name: 'نام واقعی' }) }
    const service = new GroupBuyingService(groups as never, {} as never, {} as never, users as never)

    await expect(service.createGroup({ leaderId: 'leader-1', leaderName: 'نام جعلی', title: 'گروه' })).resolves.toEqual(expect.objectContaining({ leaderName: 'نام واقعی', status: GroupBuyingStatus.OPEN }))
  })

  it('rejects adding items by a non-leader', async () => {
    const groups = { findOneBy: jest.fn().mockResolvedValue({ id: 'group-1', leaderId: 'leader-1' }) }
    const service = new GroupBuyingService(groups as never, {} as never, {} as never, {} as never)

    await expect(service.addItem('group-1', { productId: 'p1', name: 'طلا', unitPrice: 100 }, 'attacker')).rejects.toBeInstanceOf(ForbiddenException)
  })
})
