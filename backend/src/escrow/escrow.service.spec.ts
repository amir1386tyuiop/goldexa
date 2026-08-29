import { Test } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { BadRequestException, ForbiddenException } from '@nestjs/common'
import { EscrowService } from './escrow.service'
import { EscrowPayment, EscrowPaymentStatus } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'
import { UsedGoldListing, UsedGoldListingStatus, UsedGoldListingSaleType } from '../marketplace/used-gold-listing.entity'
import { Auction, AuctionStatus } from '../auctions/auction.entity'

describe('EscrowService security boundaries', () => {
  let service: EscrowService
  let escrowRepository: { find: jest.Mock; findOneBy: jest.Mock; create: jest.Mock; save: jest.Mock }
  let listingRepository: { findOneBy: jest.Mock }
  let auctionRepository: { findOneBy: jest.Mock }

  beforeEach(async () => {
    escrowRepository = {
      find: jest.fn(),
      findOneBy: jest.fn(),
      create: jest.fn((value) => value),
      save: jest.fn(async (value) => value),
    }
    listingRepository = { findOneBy: jest.fn() }
    auctionRepository = { findOneBy: jest.fn() }

    const moduleRef = await Test.createTestingModule({
      providers: [
        EscrowService,
        { provide: getRepositoryToken(EscrowPayment), useValue: escrowRepository },
        { provide: getRepositoryToken(MarketplaceRating), useValue: { find: jest.fn(), findBy: jest.fn(), create: jest.fn(), save: jest.fn() } },
        { provide: getRepositoryToken(UsedGoldListing), useValue: listingRepository },
        { provide: getRepositoryToken(Auction), useValue: auctionRepository },
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
    escrowRepository.findOneBy.mockResolvedValue({ id: 'escrow-1', status: EscrowPaymentStatus.INITIATED })
    await expect(service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.RELEASED }))
      .rejects.toThrow('مجاز نیست')

    escrowRepository.findOneBy.mockResolvedValue({ id: 'escrow-1', status: EscrowPaymentStatus.HELD })
    await expect(service.updatePaymentStatus('escrow-1', { status: EscrowPaymentStatus.RELEASED }))
      .resolves.toMatchObject({ status: EscrowPaymentStatus.RELEASED })
  })
})
