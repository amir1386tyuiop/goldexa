import { BadRequestException } from '@nestjs/common'
import { UsedGoldListingsService } from './used-gold-listings.service'
import { UsedGoldListingSaleType, UsedGoldListingStatus, UsedGoldSource } from './used-gold-listing.entity'
import { EscrowPaymentStatus } from '../escrow/escrow-payment.entity'

describe('UsedGoldListingsService', () => {
  const listingRepository = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => ({ id: 'listing-1', ...value })),
    findOne: jest.fn(async () => null),
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

  it('requires a delivered matching Goldexa order for internal-asset listings', async () => {
    const orderRepository = {
      findOneBy: jest.fn().mockResolvedValue({
        id: 'order-1', userId: 'seller-1', status: 'delivered',
        items: [{ productId: 'product-1', weight: 2, karat: 18 }],
      }),
      findOne: jest.fn().mockResolvedValue(null),
    }
    const ownedAssetService = new UsedGoldListingsService(
      listingRepository as never,
      userRepository as never,
      dataSource as never,
      walletService as never,
      undefined,
      orderRepository as never,
    )
    await expect(ownedAssetService.createListing({
      sellerId: 'seller-1', sellerName: 'x', orderId: 'order-1', productId: 'product-1',
      source: UsedGoldSource.GOLDEKSA_PURCHASE, title: 'انگشتر', description: 'x', weight: 2, karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT, fixedPrice: 1000,
    })).resolves.toMatchObject({ status: UsedGoldListingStatus.PENDING_REVIEW })

    orderRepository.findOneBy.mockResolvedValue({
      id: 'order-1', userId: 'seller-1', status: 'paid', items: [{ productId: 'product-1', weight: 2, karat: 18 }],
    })
    await expect(ownedAssetService.createListing({
      sellerId: 'seller-1', sellerName: 'x', orderId: 'order-1', productId: 'product-1',
      source: UsedGoldSource.GOLDEKSA_PURCHASE, title: 'انگشتر', description: 'x', weight: 2, karat: 18,
      saleType: UsedGoldListingSaleType.DIRECT, fixedPrice: 1000,
    })).rejects.toThrow('تحویل‌شده')
  })

  it('allows a seller to create a listing from an owned vault asset once', async () => {
    const vaultAssets = {
      findOneBy: jest.fn().mockResolvedValue({ id: 'asset-1', userId: 'seller-1', weight: 2, karat: 18 }),
    }
    const vaultService = new UsedGoldListingsService(
      listingRepository as never,
      userRepository as never,
      dataSource as never,
      walletService as never,
      undefined,
      undefined,
      vaultAssets as never,
    )
    await expect(vaultService.createListing({
      sellerId: 'seller-1', sellerName: 'x', vaultAssetId: 'asset-1', title: 'انگشتر', description: 'x',
      weight: 2, karat: 18, saleType: UsedGoldListingSaleType.DIRECT, fixedPrice: 1000,
    })).resolves.toMatchObject({ vaultAssetId: 'asset-1', status: UsedGoldListingStatus.PENDING_REVIEW })
  })

  it('atomically moves a direct listing into sold and holds the buyer funds', async () => {
    const listing = {
      id: 'listing-1', sellerId: 'seller-1', sellerName: 'فروشنده واقعی', title: 'انگشتر',
      description: 'x', weight: 2, karat: 18, saleType: UsedGoldListingSaleType.DIRECT,
      fixedPrice: 1000, commissionRate: 5, status: UsedGoldListingStatus.ACTIVE,
    }
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
    expect(result.escrow.fee).toBe(50)
  })
})
