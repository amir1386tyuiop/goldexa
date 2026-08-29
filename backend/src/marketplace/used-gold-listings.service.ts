import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  UsedGoldListing,
  UsedGoldListingSaleType,
  UsedGoldListingStatus,
  UsedGoldQualityStatus,
} from './used-gold-listing.entity'
import {
  CreateUsedGoldListingDto,
  ReviewUsedGoldListingDto,
  UpdateUsedGoldListingStatusDto,
} from './create-used-gold-listing.dto'
import { User } from '../users/user.entity'

@Injectable()
export class UsedGoldListingsService {
  constructor(
    @InjectRepository(UsedGoldListing)
    private listingRepository: Repository<UsedGoldListing>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(status?: UsedGoldListingStatus): Promise<UsedGoldListing[]> {
    const publicStatuses = [UsedGoldListingStatus.APPROVED, UsedGoldListingStatus.ACTIVE]
    const where = status && publicStatuses.includes(status)
      ? { status }
      : status
        ? { status: UsedGoldListingStatus.ACTIVE }
        : { status: UsedGoldListingStatus.ACTIVE }

    return this.listingRepository.find({
      where,
      order: { createdAt: 'DESC' },
    })
  }

  async findOne(id: string): Promise<UsedGoldListing | null> {
    const listing = await this.listingRepository.findOneBy({ id })

    if (!listing) {
      return null
    }

    await this.listingRepository.increment({ id }, 'viewCount', 1)
    return { ...listing, viewCount: listing.viewCount + 1 }
  }

  async findByUser(userId: string): Promise<UsedGoldListing[]> {
    return this.listingRepository.findBy({ sellerId: userId })
  }

  async createListing(data: CreateUsedGoldListingDto): Promise<UsedGoldListing> {
    const seller = await this.userRepository.findOneBy({ id: data.sellerId })

    if (!seller) {
      throw new NotFoundException('فروشنده یافت نشد')
    }

    if (!Number.isFinite(data.weight) || data.weight <= 0 || !Number.isInteger(data.karat) || data.karat < 1 || data.karat > 24) {
      throw new BadRequestException('وزن و عیار آگهی نامعتبر است')
    }

    if (data.saleType === UsedGoldListingSaleType.DIRECT && (!Number.isFinite(data.fixedPrice) || (data.fixedPrice ?? 0) <= 0)) {
      throw new BadRequestException('برای فروش مستقیم قیمت ثابت الزامی است')
    }

    if (data.saleType === UsedGoldListingSaleType.AUCTION && (!Number.isFinite(data.startingPrice) || (data.startingPrice ?? 0) <= 0)) {
      throw new BadRequestException('برای مزایده قیمت پایه الزامی است')
    }
    if (data.saleType === UsedGoldListingSaleType.AUCTION && (!Number.isFinite(data.minimumBidIncrement) || (data.minimumBidIncrement ?? 0) <= 0)) {
      throw new BadRequestException('حداقل افزایش مزایده الزامی است')
    }

    const listing = this.listingRepository.create({
      ...data,
      sellerId: seller.id,
      sellerName: seller.name,
      images: data.images ?? [],
      stones: data.stones ?? null,
      dimensions: data.dimensions ?? null,
      metalColor: data.metalColor ?? null,
      lockType: data.lockType ?? null,
      fixedPrice: data.fixedPrice ?? null,
      startingPrice: data.startingPrice ?? null,
      reservePrice: data.reservePrice ?? null,
      minimumBidIncrement: data.minimumBidIncrement ?? null,
      auctionDurationDays: data.auctionDurationDays ?? 3,
      autoExtendEnabled: data.autoExtendEnabled ?? true,
      autoExtendMinutes: data.autoExtendMinutes ?? 2,
      autoExtendSeconds: data.autoExtendSeconds ?? 300,
      paymentWindowMinutes: data.paymentWindowMinutes ?? 1440,
      commissionRate: data.commissionRate ?? 0,
      qualityStatus: UsedGoldQualityStatus.NOT_SENT,
      qualityBadge: false,
      status: UsedGoldListingStatus.PENDING_REVIEW,
    })

    return this.listingRepository.save(listing)
  }

  async reviewListing(id: string, data: ReviewUsedGoldListingDto): Promise<UsedGoldListing | null> {
    await this.listingRepository.update(id, {
      qualityStatus: data.qualityStatus,
      expertName: data.expertName ?? null,
      expertNotes: data.expertNotes ?? null,
      qualityBadge: data.qualityStatus === UsedGoldQualityStatus.APPROVED,
      status:
        data.qualityStatus === UsedGoldQualityStatus.APPROVED
          ? UsedGoldListingStatus.APPROVED
          : UsedGoldListingStatus.REJECTED,
    })

    return this.listingRepository.findOneBy({ id })
  }

  async updateStatus(
    id: string,
    data: UpdateUsedGoldListingStatusDto,
  ): Promise<UsedGoldListing | null> {
    await this.listingRepository.update(id, { status: data.status })
    return this.listingRepository.findOneBy({ id })
  }
}
