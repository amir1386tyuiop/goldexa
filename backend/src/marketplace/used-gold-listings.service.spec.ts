import { BadRequestException } from '@nestjs/common'
import { UsedGoldListingsService } from './used-gold-listings.service'
import { UsedGoldListingSaleType, UsedGoldListingStatus } from './used-gold-listing.entity'
import { EscrowPaymentStatus } from '../escrow/escrow-payment.entity'

describe('UsedGoldListingsService', () => {
  const listingRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'listing-1', ...value })),
  }
  const userRepository = {
    findOneBy: jest.fn(async () => ({ id: 'seller-1', name: 'فروشنده واقعی' })),
  }
  const dataSource = { transaction: jest.fn() }
  const walletService = { ensureWalletForUser: jest.fn(), holdEscrow: jest.fn() }
  const service = new UsedGoldListingsService(
    listingRepository as never,
    userRepository as never,
    dataSource as never,
    walletService as never,
  )

  beforeEach(() => jest.clearAllMocks())

  it('never trusts client seller identity or publication status', async () => {
    const result = await service.createListing({
      sellerId: 'seller-1',
      sellerName: 'فروشنده جعلی',
      title: 'انگشتر',
      description: 'توضیح',
      weight: 2,
      karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT,
      fixedPrice: 1000,
      status: UsedGoldListingStatus.ACTIVE,
    })

    expect(result.sellerName).toBe('فروشنده واقعی')
    expect(result.status).toBe(UsedGoldListingStatus.PENDING_REVIEW)
  })

  it('rejects incomplete direct and auction pricing', async () => {
    await expect(service.createListing({
      sellerId: 'seller-1', sellerName: 'x', title: 'x', description: 'x', weight: 1, karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT,
    })).rejects.toBeInstanceOf(BadRequestException)

    await expect(service.createListing({
      sellerId: 'seller-1', sellerName: 'x', title: 'x', description: 'x', weight: 1, karat: 18,
      saleType: UsedGoldListingSaleType.AUCTION, startingPrice: 1000,
    })).rejects.toBeInstanceOf(BadRequestException)
  })

  it('atomically moves a direct listing into sold and holds the buyer funds', async () => {
    const listing = {
      id: 'listing-1', sellerId: 'seller-1', sellerName: 'فروشنده واقعی', title: 'انگشتر',
      description: 'x', weight: 2, karat: 18, saleType: UsedGoldListingSaleType.DIRECT,
      fixedPrice: 1000, status: UsedGoldListingStatus.ACTIVE,
    }
    const escrowRepository = { findOne: jest.fn(), create: jest.fn((value) => value) }
    const orderRepository = {}
    const manager = {
      findOne: jest.fn(async (entity: unknown) => {
        if (entity === Object.getPrototypeOf(listing).constructor) return listing
        return null
      }),
      create: jest.fn((_, value) => value),
      save: jest.fn(async (entity: unknown, value?: Record<string, unknown>) => {
        if (!value) return entity
        if (value.status === EscrowPaymentStatus.INITIATED) return { ...value, id: 'escrow-1' }
        if (value.orderNumber) return { ...value, id: 'order-1' }
        return value
      }),
    }
    const dataSource = { transaction: jest.fn(async (callback: (value: typeof manager) => unknown) => callback(manager)) }
    const purchaseService = new UsedGoldListingsService(
      { ...listingRepository, findOneBy: jest.fn(async () => listing) } as never,
      userRepository as never,
      dataSource as never,
      { ensureWalletForUser: jest.fn(), holdEscrow: jest.fn() } as never,
    )

    // The entity constructor check is intentionally replaced with a stable
    // lookup for this unit test's lightweight manager mock.
    manager.findOne.mockResolvedValueOnce(listing).mockResolvedValueOnce(null)
    const result = await purchaseService.purchaseDirect('listing-1', { address: { city: 'تهران' } }, 'buyer-1')

    expect(result.listing.status).toBe(UsedGoldListingStatus.SOLD)
    expect(result.order.status).toBe('paid')
    expect(result.escrow.status).toBe(EscrowPaymentStatus.HELD)
  })
})
