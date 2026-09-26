/* eslint-disable @typescript-eslint/no-explicit-any */
import { BadRequestException } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { WalletTransactionType } from './wallet-transaction.entity'

describe('WalletService financial invariants', () => {
  const wallet = {
    id: 'wallet-1',
    userId: 'user-1',
    balance: 1000,
    goldBalanceGrams: 0,
    isActive: true,
  }
  let manager: any
  let service: WalletService
  let dataSource: any
  let walletRepository: any
  let transactionRepository: any
  let audit: any

  beforeEach(() => {
    manager = {
      findOne: jest.fn(),
      save: jest.fn(async (value) => value),
      create: jest.fn((_, value) => ({ id: 'tx-1', ...value })),
    }
    walletRepository = {
      findOneBy: jest.fn(async () => wallet),
      save: jest.fn(async (value) => value),
      create: jest.fn((value) => value),
    }
    transactionRepository = { find: jest.fn(), findBy: jest.fn() }
    dataSource = {
      transaction: jest.fn(async (callback) => callback(manager)),
    }
    audit = { record: jest.fn(async () => undefined) }
    service = new WalletService(
      walletRepository,
      transactionRepository,
      dataSource,
      {} as any,
      { get: jest.fn() } as any,
      audit,
    )
  })

  it('locks the wallet and appends a balanced payment ledger entry', async () => {
    manager.findOne.mockResolvedValueOnce({ ...wallet })

    const result = await service.payment({ userId: 'user-1', amount: 250, orderId: 'order-1' })

    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), {
      where: { userId: 'user-1' },
      lock: { mode: 'pessimistic_write' },
    })
    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ balance: 750 }))
    expect(result).toEqual(expect.objectContaining({ type: WalletTransactionType.PAYMENT, amount: -250 }))
  })

  it('rejects a debit that would make the balance negative', async () => {
    manager.findOne.mockResolvedValueOnce({ ...wallet, balance: 100 })

    await expect(service.payment({ userId: 'user-1', amount: 101, orderId: 'order-1' })).rejects.toBeInstanceOf(
      BadRequestException,
    )
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('returns the existing payment on a retry and does not debit twice', async () => {
    const existing = { id: 'tx-existing', type: WalletTransactionType.PAYMENT, amount: -250, amountGrams: 0 }
    manager.findOne.mockResolvedValueOnce({ ...wallet }).mockResolvedValueOnce(existing)

    const result = await service.payOrderWithWallet('user-1', 'order-1', 250, manager)

    expect(result).toBe(existing)
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('rejects generic deposit/payment ledger mutations', async () => {
    await expect(
      service.createTransaction({ userId: 'user-1', type: WalletTransactionType.DEPOSIT, amount: 100 }),
    ).rejects.toBeInstanceOf(BadRequestException)
    await expect(
      service.createTransaction({ userId: 'user-1', type: WalletTransactionType.PAYMENT, amount: -100 }),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(dataSource.transaction).not.toHaveBeenCalled()
  })

  it('does not leave a ledger entry when the database transaction rolls back', async () => {
    dataSource.transaction.mockRejectedValueOnce(new Error('db failure'))

    await expect(service.payment({ userId: 'user-1', amount: 250, orderId: 'order-1' })).rejects.toThrow('db failure')
    expect(audit.record).not.toHaveBeenCalled()
  })

  it('makes escrow holds idempotent by escrow id and transaction type', async () => {
    const existing = {
      id: 'hold-1',
      type: WalletTransactionType.ESCROW_HOLD,
      amount: -250,
      amountGrams: 0,
    }
    manager.findOne
      .mockResolvedValueOnce({ ...wallet })
      .mockResolvedValueOnce(existing)

    const result = await service.holdEscrow('user-1', 'escrow-1', 250, manager)

    expect(result).toBe(existing)
    expect(manager.save).not.toHaveBeenCalled()
  })

  it('credits community rewards idempotently through the locked ledger', async () => {
    manager.findOne.mockResolvedValueOnce({ ...wallet })

    const result = await service.creditCommunityReward('user-1', 'reward-1', 500000, 'جایزه')

    expect(manager.save).toHaveBeenCalledWith(expect.objectContaining({ balance: 501000 }))
    expect(result).toEqual(expect.objectContaining({ type: WalletTransactionType.COMMUNITY_REWARD, amount: 500000, rewardId: 'reward-1' }))

    manager.findOne.mockReset()
    manager.findOne.mockResolvedValueOnce({ ...wallet }).mockResolvedValueOnce({ id: 'tx-reward', amount: 500000, amountGrams: 0 })
    await expect(service.creditCommunityReward('user-1', 'reward-1', 500000, 'جایزه')).resolves.toEqual(expect.objectContaining({ id: 'tx-reward' }))
  })
})
