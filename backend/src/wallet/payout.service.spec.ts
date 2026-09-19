import { BadRequestException } from '@nestjs/common'
import { PayoutService } from './payout.service'
import { PayoutRequestStatus } from './payout-request.entity'

describe('PayoutService', () => {
  it('reserves the wallet balance atomically and is idempotent', async () => {
    const requestRepository = {
      findOneBy: jest.fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'payout-1', userId: 'user-1' }),
      find: jest.fn(),
    }
    const bankRepository = { findOneBy: jest.fn().mockResolvedValue({ id: 'bank-1', userId: 'user-1' }) }
    const request = { id: 'payout-1', userId: 'user-1', amount: 10000, status: PayoutRequestStatus.PENDING }
    const manager = {
      create: jest.fn((_entity, value) => ({ ...value, id: 'payout-1' })),
      save: jest.fn(async (value) => value),
    }
    const dataSource = { transaction: jest.fn(async (callback) => callback(manager)) }
    const wallet = {
      ensureWalletForUser: jest.fn(),
      holdPayout: jest.fn(),
      refundPayout: jest.fn(),
    }
    const service = new PayoutService(requestRepository as never, bankRepository as never, dataSource as never, wallet as never)

    const created = await service.create('user-1', { amount: 10000, idempotencyKey: 'key-1' })
    expect(created.id).toBe('payout-1')
    expect(wallet.holdPayout).toHaveBeenCalledWith('user-1', 'payout-1', 10000, manager)
    const repeated = await service.create('user-1', { amount: 10000, idempotencyKey: 'key-1' })
    expect(repeated.id).toBe('payout-1')
  })

  it('refunds a rejected request exactly once', async () => {
    const request = { id: 'payout-1', userId: 'user-1', amount: 10000, status: PayoutRequestStatus.PENDING }
    const manager = {
      findOne: jest.fn().mockResolvedValue(request),
      save: jest.fn(async (value) => value),
    }
    const service = new PayoutService(
      {} as never,
      {} as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
      { refundPayout: jest.fn() } as never,
    )
    const result = await service.resolve('payout-1', 'admin-1', PayoutRequestStatus.REJECTED, { reason: 'حساب بانکی نامعتبر' })
    expect(result.status).toBe(PayoutRequestStatus.REJECTED)
    expect((service as never as { walletService: { refundPayout: jest.Mock } }).walletService.refundPayout).toHaveBeenCalledWith('user-1', 'payout-1', 10000, manager)
    request.status = PayoutRequestStatus.REJECTED
    await expect(service.resolve('payout-1', 'admin-1', PayoutRequestStatus.PAID, {})).rejects.toBeInstanceOf(BadRequestException)
  })
})
