import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { AuctionsService } from './auctions.service'
import {
  CreateAuctionDto,
  PlaceBidDto,
  SettleAuctionDto,
  UpdateAuctionReviewDto,
  UpdateAuctionStatusDto,
} from './create-auction.dto'

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

  @Get('user/:userId')
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
  async create(@Body() body: CreateAuctionDto) {
    return this.auctionsService.createAuction(body)
  }

  @Post(':id/bid')
  async placeBid(@Param('id') id: string, @Body() body: PlaceBidDto) {
    return this.auctionsService.placeBid(id, body)
  }

  @Post(':id/settle')
  async settle(@Param('id') id: string, @Body() body: SettleAuctionDto) {
    return this.auctionsService.settleAuction(id, body)
  }

  @Patch(':id/review')
  async updateReview(@Param('id') id: string, @Body() body: UpdateAuctionReviewDto) {
    return this.auctionsService.updateReview(id, body)
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: UpdateAuctionStatusDto) {
    return this.auctionsService.updateStatus(id, body.status)
  }

  @Patch(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.auctionsService.cancelAuction(id)
  }
}
