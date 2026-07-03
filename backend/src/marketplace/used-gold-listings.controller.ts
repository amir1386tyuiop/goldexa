import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import {
  CreateUsedGoldListingDto,
  ReviewUsedGoldListingDto,
  UpdateUsedGoldListingStatusDto,
} from './create-used-gold-listing.dto'
import { UsedGoldListingStatus } from './used-gold-listing.entity'
import { UsedGoldListingsService } from './used-gold-listings.service'

@Controller('marketplace/listings')
export class UsedGoldListingsController {
  constructor(private readonly listingsService: UsedGoldListingsService) {}

  @Get()
  async findAll(@Query('status') status?: UsedGoldListingStatus) {
    return this.listingsService.findAll(status)
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.listingsService.findByUser(userId)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id)
  }

  @Post()
  async create(@Body() body: CreateUsedGoldListingDto) {
    return this.listingsService.createListing(body)
  }

  @Patch(':id/review')
  async review(@Param('id') id: string, @Body() body: ReviewUsedGoldListingDto) {
    return this.listingsService.reviewListing(id, body)
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateUsedGoldListingStatusDto) {
    return this.listingsService.updateStatus(id, body)
  }
}
