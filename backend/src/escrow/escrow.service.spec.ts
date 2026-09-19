import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { EscrowService } from './escrow.service'
import { EscrowPayment, EscrowPaymentStatus } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import { UsedGoldListing, UsedGoldListingStatus, UsedGoldListingSaleType } from '../marketplace/used-gold-listing.entity'
import { Auction, AuctionStatus } from '../auctions/auction.entity'
import { WalletService } from '../wallet/wallet.service'
import { SmartVaultAsset } from '../smart-vault/smart-vault-asset.entity'

describe('EscrowService security boundaries', () => {
  let service: EscrowService
  let escrowRepository: { find: jest.Mock; findOne: jest.Mock; findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock }
  let ratingRepository: { find: jest.Mock; findBy: jest.Mock; create: jest.Mock; save: jest.Mock }
  let listingRepository: { findOneBy: jest.Mock }
  let auctionRepository: { findOneBy: jest.Mock }
  let walletService: { ensureWalletForUser: jest.Mock; holdEscrow: jest.Mock; releaseEscrow: jest.Mock; refundEscrow: jest.Mock }
  let dataSource: { transaction: jest.Mock }
  let transactionManager: { findOne: jest.Mock; save: jest.Mock; update: jest.Mock; create: jest.Mock }

  beforeEach(async () => {
    escrowRepository = {
      find: jest.fn(),
      findOne: jest.fn(async (options) => escrowRepository.findOneBy(options.where)),
      findOneBy: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }
    listingRepository = { findOneBy: jest.fn() }
    auctionRepository = { findOneBy: jest.fn() }
    ratingRepository = { find: jest.fn(), findBy: jest.fn(), create: jest.fn((value) => value), save: jest.fn(async (value) => value) }
    walletService = {
      ensureWalletForUser: jest.fn(),
      holdEscrow: jest.fn(),
      releaseEscrow: jest.fn(),
      refundEscrow: jest.fn(),
    }
    transactionManager = {
      findOne: jest.fn(async (entity, options) =>
        entity === Auction
          ? null
          : escrowRepository.findOneBy(options.where)),
      save: jest.fn(async (...args) => args.length === 2 ? args[1] : args[0]),
      update: jest.fn(),
      create: jest.fn((_entity, value) => value),
    }
    dataSource = { transaction: jest.fn(async (callback) => callback(transactionManager)) }

    const moduleRef = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: getRepositoryToken(EscrowPayment), useValue: escrowRepository },
        { provide: getRepositoryToken(MarketplaceRating), useValue: ratingRepository },
        { provide: getRepositoryToken(UsedGoldListing), useValue: listingRepository },
        { provide: getRepositoryToken(Auction), useValue: auctionRepository },
        { provide: getRepositoryToken(SmartVaultAsset), useValue: { findOneBy: jest.fn() } },
        { provide: DataSource, useValue: dataSource },
        { provide: WalletService, useValue: walletService },
      ],
    }).compile()

    service = moduleRef.get(EscrowService)
  })

  it('resolves seller from an active listing and rejects a forged sellerId', async () => {
    listingRepository.findOneBy.mockResolvedValue({
      id: 'listing-1',
      sellerId: 'seller-1',
      status: UsedGoldListingStatus.ACTIVE,
      saleType: UsedGoldListingSaleType.DIRECT,
      fixedPrice: 100,
    })

    const payment = await service.createPayment({
      buyerId: 'buyer-1',
      listingId: 'listing-1',
      amount: 100,
    })

    expect(payment.sellerId).toBe('seller-1')
    expect(payment.status).toBe(EscrowPaymentStatus.INITIATED)

    await expect(service.createPayment({
      buyerId: 'buyer-1', sellerId: 'attacker', listingId: 'listing-1', amount: 100,
    })).rejects.toThrow('فروشنده با listing مطابقت ندارد')
  })

  it('rejects listing payments with an incorrect amount or inactive listing', async () => {
    listingRepository.findOneBy.mockResolvedValue({
      id: 'listing-1', sellerId: 'seller-1', status: UsedGoldListingStatus.ACTIVE,
      saleType: UsedGoldListingSaleType.DIRECT, fixedPrice: 100,
    })
    await expect(service.createPayment({ buyerId: 'buyer-1', listingId: 'listing-1', amount: 99 }))
      .rejects.toThrow(BadRequestException)

    listingRepository.findOneBy.mockResolvedValue({
      id: 'listing-1', sellerId: 'seller-1', status: UsedGoldListingStatus.DRAFT,
      saleType: UsedGoldListingSaleType.DIRECT, fixedPrice: 100,
    })
    await expect(service.createPayment({ buyerId: 'buyer-1', listingId: 'listing-1', amount: 100 }))
      .rejects.toThrow('listing برای پرداخت فعال نیست')
  })

  it('requires the winning bidder and authoritative amount for auction payment', async () => {
    auctionRepository.findOneBy.mockResolvedValue({
      id: 'auction-1', sellerId: 'seller-1', status: AuctionStatus.AWAITING_PAYMENT,
      winningBidderId: 'winner-1', winningAmount: 250,
    })
    const payment = await service.createPayment({ buyerId: 'winner-1', auctionId: 'auction-1', amount: 250 })
    expect(payment.sellerId).toBe('seller-1')

    await expect(service.createPayment({ buyerId: 'other-buyer', auctionId: 'auction-1', amount: 250 }))
      .rejects.toThrow(ForbiddenException)
    await expect(service.createPayment({ buyerId: 'winner-1', auctionId: 'auction-1', amount: 251 }))
      .rejects.toThrow('مبلغ پرداخت با مبلغ برنده auction مطابقت ندارد')
  })

  it('scopes payment reads to buyer or seller unless the caller is an admin', async () => {
    escrowRepository.findOneBy.mockResolvedValue({ id: 'escrow-1', buyerId: 'buyer-1', sellerId: 'seller-1' })
    await expect(service.findPayment('escrow-1', 'stranger')).rejects.toThrow(ForbiddenException)
    await expect(service.findPayment('escrow-1', 'buyer-1')).resolves.toBeTruthy()
    await expect(service.findPayment('escrow-1', 'admin', true)).resolves.toBeTruthy()
  })

  it('allows only explicitly defined status transitions', async () => {
    escrowRepository.findOneBy.mockResolvedValue({
      id: 'escrow-1', status: EscrowPaymentStatus.INITIATED,
      buyerId: 'buyer-1', sellerId: 'seller-1', amount: 100, fee: 5,
    })
    await expect(service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.RELEASED }))
      .rejects.toThrow('مجاز نیست')

    escrowRepository.findOneBy.mockResolvedValue({
      id: 'escrow-1', status: EscrowPaymentStatus.HELD,
      buyerId: 'buyer-1', sellerId: 'seller-1', amount: 100, fee: 5,
    })
    await expect(service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.RELEASED }))
      .resolves.toMatchObject({ status: EscrowPaymentStatus.RELEASED })
    expect(walletService.releaseEscrow).toHaveBeenCalledWith('seller-1', 'escrow-1', 95, expect.anything())
  })

  it('accepts ratings only from a completed trade and blocks duplicates', async () => {
    escrowRepository.find.mockResolvedValue([{
      status: EscrowPaymentStatus.RELEASED,
      buyerId: 'buyer-1',
      sellerId: 'seller-1',
      listingId: 'listing-1',
      orderId: 'order-1',
    }])
    ratingRepository.find.mockResolvedValue([])

    const rating = await service.createRating({
      reviewerId: 'buyer-1', revieweeId: 'seller-1', listingId: 'listing-1',
      rating: 5, category: 'delivery', body: 'عالی',
    })
    expect(rating.reviewerId).toBe('buyer-1')
    expect(ratingRepository.save).toHaveBeenCalled()

    ratingRepository.find.mockResolvedValue([{ listingId: 'listing-1', orderId: null }])
    await expect(service.createRating({
      reviewerId: 'buyer-1', revieweeId: 'seller-1', listingId: 'listing-1',
      rating: 4, category: 'delivery',
    })).rejects.toThrow('قبلاً امتیاز')

    escrowRepository.find.mockResolvedValue([])
    await expect(service.createRating({
      reviewerId: 'stranger', revieweeId: 'seller-1', listingId: 'listing-1',
      rating: 1, category: 'delivery',
    })).rejects.toThrow(ForbiddenException)
  })

  it('applies wallet hold and refund exactly once across escrow transitions', async () => {
    const payment = {
      id: 'escrow-1', status: EscrowPaymentStatus.INITIATED,
      buyerId: 'buyer-1', sellerId: 'seller-1', amount: 100, fee: 0,
    }
    escrowRepository.findOneBy.mockResolvedValue(payment)

    await service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.HELD })
    expect(walletService.holdEscrow).toHaveBeenCalledWith('buyer-1', 'escrow-1', 100, expect.anything())

    payment.status = EscrowPaymentStatus.HELD
    await service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.REFUNDED })
    expect(walletService.refundEscrow).toHaveBeenCalledWith('buyer-1', 'escrow-1', 100, expect.anything())
  })

  it('opens a dispute for a participant and requires an admin resolution note', async () => {
    const payment = {
      id: 'escrow-1', status: EscrowPaymentStatus.HELD,
      buyerId: 'buyer-1', sellerId: 'seller-1', amount: 100, fee: 0,
    }
    escrowRepository.findOneBy.mockResolvedValue(payment)

    const disputed = await service.openDispute('escrow-1', 'buyer-1', 'کالا با توضیحات مطابقت ندارد')
    expect(disputed.status).toBe(EscrowPaymentStatus.DISPUTED)
    expect(disputed.disputedBy).toBe('buyer-1')

    await expect(service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.RELEASED }))
      .rejects.toThrow('یادداشت حل اختلاف الزامی است')

    const resolved = await service.updatePaymentStatus('escrow-1', {
      status: EscrowPaymentStatus.REFUNDED,
      resolutionNote: 'مدرک خریدار بررسی و refund تایید شد',
    })
    expect(resolved?.status).toBe(EscrowPaymentStatus.REFUNDED)
    expect(resolved?.resolutionNote).toContain('refund')
  })

  it('settles the related auction in the same transaction as escrow release', async () => {
    const payment = {
      id: 'escrow-auction-1',
      auctionId: 'auction-1',
      status: EscrowPaymentStatus.HELD,
      buyerId: 'winner-1',
      sellerId: 'seller-1',
      amount: 250,
      fee: 5,
    }
    const auction = {
      id: 'auction-1',
      status: AuctionStatus.AWAITING_PAYMENT,
      paymentStatus: 'unpaid',
      winningBidderId: 'winner-1',
      winningAmount: 250,
      paymentDeadlineAt: new Date(),
    }
    escrowRepository.findOneBy.mockResolvedValue(payment)
    transactionManager.findOne.mockImplementation(async (entity) => entity === Auction ? auction : payment)

    const released = await service.updatePaymentStatus(payment.id, { status: EscrowPaymentStatus.RELEASED })

    expect(walletService.releaseEscrow).toHaveBeenCalledWith('seller-1', payment.id, 245, expect.anything())
    expect(auction.status).toBe(AuctionStatus.COMPLETED)
    expect(auction.paymentStatus).toBe('settled')
    expect(auction.paymentDeadlineAt).toBeNull()
    expect(transactionManager.save).toHaveBeenCalledWith(Auction, auction)
    expect(released?.status).toBe(EscrowPaymentStatus.RELEASED)
  })

  it('transfers a released used-gold listing into the buyer vault exactly once', async () => {
    const payment = {
      id: 'escrow-listing-1', listingId: 'listing-1', orderId: 'order-1',
      status: EscrowPaymentStatus.HELD, buyerId: 'buyer-1', sellerId: 'seller-1', amount: 100, fee: 5,
    }
    const listing = {
      id: 'listing-1', title: 'انگشتر دست‌دوم', sellerId: 'seller-1', productId: 'product-1',
      weight: 2, karat: 18, images: ['ring.jpg'], intrinsicGoldValue: 90,
    }
    escrowRepository.findOneBy.mockResolvedValue(payment)
    transactionManager.findOne.mockImplementation(async (entity, options) => {
      if (entity === SmartVaultAsset) return null
      if (entity === UsedGoldListing) return listing
      return escrowRepository.findOneBy(options?.where)
    })

    const released = await service.updatePaymentStatus(payment.id, { status: EscrowPaymentStatus.RELEASED })

    expect(released?.status).toBe(EscrowPaymentStatus.RELEASED)
    expect(transactionManager.save).toHaveBeenCalledWith(SmartVaultAsset, expect.objectContaining({
      userId: 'buyer-1', sourceEscrowId: payment.id, orderId: 'order-1', weight: 2,
    }))
  })
})
