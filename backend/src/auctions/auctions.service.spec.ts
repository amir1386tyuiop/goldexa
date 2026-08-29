import { BadRequestException } from '@nestjs/common'
import { AuctionsService } from './auctions.service'
import { AuctionStatus, BidIncrementType } from './auction.entity'

describe('AuctionsService', () => {
  const noOpQueryBuilder = () => ({
    update: jest.fn().mockReturnThis(), set: jest.fn().mockReturnThis(), where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(), execute: jest.fn(async () => undefined),
  })

  it('re-evaluates the minimum bid while holding the auction row lock', async () => {
    const auction = {
      id: 'auction-1', status: AuctionStatus.ACTIVE, sellerId: 'seller-1', currentPrice: 1000,
      minimumBidIncrement: 100, bidIncrementType: BidIncrementType.AMOUNT, bidIncrementPercent: 0,
      autoExtendMinutes: 0, autoExtendSeconds: 0, paymentWindowMinutes: 60, bidCount: 0,
      reservePrice: null, endsAt: new Date(Date.now() + 3600000), paymentDeadlineAt: null,
      winningBidderId: null, winningBidderName: null, winningAmount: null, reserveMet: false,
    }
    const manager = {
      findOne: jest.fn(async () => auction),
      update: jest.fn(async () => undefined),
      create: jest.fn((_type, value) => value),
      save: jest.fn(async (_type, value) => value),
    }
    const dataSource = { transaction: jest.fn(async (callback) => callback(manager)) }
    const service = new AuctionsService(
      { findOneBy: jest.fn(async () => auction), find: jest.fn(async () => []), save: jest.fn(), createQueryBuilder: noOpQueryBuilder } as never,
      { findOneBy: jest.fn(), update: jest.fn(), save: jest.fn() } as never,
      {} as never,
      { findOneBy: jest.fn(async () => ({ id: 'buyer-1', name: 'خریدار' })) } as never,
      dataSource as never,
    )

    const result = await service.placeBid('auction-1', { amount: 1100 }, 'buyer-1')
    expect(dataSource.transaction).toHaveBeenCalledTimes(1)
    expect(manager.findOne).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ lock: { mode: 'pessimistic_write' } }))
    expect(result.currentPrice).toBe(1100)
    expect(result.winningBidderId).toBe('buyer-1')
  })

  it('rejects a bid below the locked current minimum', async () => {
    const auction = {
      id: 'auction-1', status: AuctionStatus.ACTIVE, sellerId: 'seller-1', currentPrice: 1000,
      minimumBidIncrement: 100, bidIncrementType: BidIncrementType.AMOUNT, bidIncrementPercent: 0,
      autoExtendMinutes: 0, autoExtendSeconds: 0,
    }
    const manager = { findOne: jest.fn(async () => auction) }
    const service = new AuctionsService(
      { findOneBy: jest.fn(async () => auction), find: jest.fn(async () => []), createQueryBuilder: noOpQueryBuilder } as never,
      {} as never, {} as never,
      { findOneBy: jest.fn(async () => ({ id: 'buyer-1', name: 'خریدار' })) } as never,
      { transaction: jest.fn(async (callback) => callback(manager)) } as never,
    )
    await expect(service.placeBid('auction-1', { amount: 1050 }, 'buyer-1')).rejects.toBeInstanceOf(BadRequestException)
  })
})
