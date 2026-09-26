import { BuyerRequestStatus } from './buyer-request.entity'
import { LiquidityRequestStatus } from './liquidity-request.entity'
import { LiquidityService } from './liquidity.service'

describe('LiquidityService', () => {
  const repository = () => ({
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findBy: jest.fn(),
    findOneBy: jest.fn(),
  })

  it('always starts a liquidity request in draft state', async () => {
    const requests = repository()
    const service = new LiquidityService(requests as never, repository() as never, repository() as never)

    const result = await service.createRequest({
      userId: 'user-1',
      expectedPrice: 1000,
      notes: 'test',
      status: 'sold',
    } as never)

    expect(result.status).toBe(LiquidityRequestStatus.DRAFT)
    expect(requests.create).toHaveBeenCalledWith(expect.objectContaining({ status: LiquidityRequestStatus.DRAFT }))
  })

  it('always starts a buyer request as open', async () => {
    const buyers = repository()
    const service = new LiquidityService(repository() as never, repository() as never, buyers as never)

    const result = await service.createBuyerRequest({
      userId: 'user-1',
      budget: 1000,
      status: 'closed',
    } as never)

    expect(result.status).toBe(BuyerRequestStatus.OPEN)
    expect(buyers.create).toHaveBeenCalledWith(expect.objectContaining({ status: BuyerRequestStatus.OPEN }))
  })
})
