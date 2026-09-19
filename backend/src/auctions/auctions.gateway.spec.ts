import { AuctionsGateway } from './auctions.gateway'

describe('AuctionsGateway', () => {
  it('joins and leaves an isolated auction room', async () => {
    const gateway = new AuctionsGateway()
    const client = {
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
    }

    await expect(gateway.joinAuction(client as never, { auctionId: 'auction-1' }))
      .resolves.toEqual({ event: 'auction.joined', data: { auctionId: 'auction-1' } })
    expect(client.join).toHaveBeenCalledWith('auction:auction-1')

    await gateway.leaveAuction(client as never, { auctionId: 'auction-1' })
    expect(client.leave).toHaveBeenCalledWith('auction:auction-1')
  })

  it('broadcasts a bid only to the matching auction room', () => {
    const gateway = new AuctionsGateway()
    const emit = jest.fn()
    gateway.server = { to: jest.fn(() => ({ emit })) } as never

    gateway.publishBid({ id: 'auction-2' } as never, { id: 'bid-1' } as never)

    expect(gateway.server.to).toHaveBeenCalledWith('auction:auction-2')
    expect(emit).toHaveBeenCalledWith('auction.updated', expect.objectContaining({
      auction: { id: 'auction-2' },
      bid: { id: 'bid-1' },
    }))
  })
})
