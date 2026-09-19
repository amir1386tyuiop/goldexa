import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AuctionsService } from './auctions.service'
import {
  CreateAuctionDto,
  PlaceBidDto,
  UpdateAuctionReviewDto,
  UpdateAuctionStatusDto,
} from './create-auction.dto'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { OwnerGuard, OwnerParam } from '../common/guards/owner.guard'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('auctions')
export class AuctionsController {
  constructor(private readonly auctionsService: AuctionsService) {}

  @Get()
  async findAll() {
    return this.auctionsService.findAll()
  }

  @Get('active')
  async findActive() {
    return this.auctionsService.findActive()
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findAllForAdmin() {
    return this.auctionsService.findAllForAdmin()
  }

  @Get('user/:userId')
  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('userId')
  async findByUser(@Param('userId') userId: string) {
    return this.auctionsService.findByUser(userId)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.auctionsService.findOne(id)
  }

  @Get(':id/bids')
  async findBids(@Param('id') id: string) {
    return this.auctionsService.findBids(id)
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: CreateAuctionDto, @Req() req: AuthenticatedRequest) {
    return this.auctionsService.createAuction(body, req.user.sub)
  }

  @Post(':id/bid')
  @UseGuards(JwtAuthGuard)
  async placeBid(@Param('id') id: string, @Body() body: PlaceBidDto, @Req() req: AuthenticatedRequest) {
    return this.auctionsService.placeBid(id, body, req.user.sub)
  }

  @Post(':id/settle')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async settle(@Param('id') id: string) {
    return this.auctionsService.settleAuction(id)
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateReview(@Param('id') id: string, @Body() body: UpdateAuctionReviewDto) {
    return this.auctionsService.updateReview(id, body)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStatus(@Param('id') id: string, @Body() body: UpdateAuctionStatusDto) {
    return this.auctionsService.updateStatus(id, body.status)
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async cancel(@Param('id') id: string) {
    return this.auctionsService.cancelAuction(id)
  }

}
