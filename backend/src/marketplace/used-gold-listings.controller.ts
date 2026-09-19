import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import {
  CreateUsedGoldListingDto,
  ReviewUsedGoldListingDto,
  UpdateUsedGoldListingStatusDto,
  PurchaseUsedGoldListingDto,
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
  @UseGuards(JwtAuthGuard)
  async findByUser(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    return this.listingsService.findByUser(req.user.role === 'admin' ? userId : req.user.sub)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.listingsService.findOne(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: CreateUsedGoldListingDto, @Req() req: Request & { user: JwtUser }) {
    return this.listingsService.createListing({ ...body, sellerId: req.user.sub })
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async review(@Param('id') id: string, @Body() body: ReviewUsedGoldListingDto) {
    return this.listingsService.reviewListing(id, body)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStatus(@Param('id') id: string, @Body() body: UpdateUsedGoldListingStatusDto) {
    return this.listingsService.updateStatus(id, body)
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  async cancelOwn(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.listingsService.cancelOwnListing(id, req.user.sub)
  }

  @Post(':id/purchase')
  @UseGuards(JwtAuthGuard)
  async purchase(
    @Param('id') id: string,
    @Body() body: PurchaseUsedGoldListingDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.listingsService.purchaseDirect(id, body, req.user.sub)
  }
}
