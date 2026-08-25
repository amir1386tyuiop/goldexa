import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { EscrowService } from './escrow.service'
import {
  CreateEscrowPaymentDto,
  CreateMarketplaceRatingDto,
  UpdateEscrowStatusDto,
} from './create-escrow.dto'

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('payments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findPayments() {
    return this.escrowService.findPayments()
  }

  @Get('payments/:id')
  async findPayment(@Param('id') id: string) {
    return this.escrowService.findPayment(id)
  }

  @Post('payments')
  async createPayment(@Body() body: CreateEscrowPaymentDto, @Req() req: Request & { user: JwtUser }) {
    return this.escrowService.createPayment({ ...body, buyerId: req.user.sub })
  }

  @Patch('payments/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updatePaymentStatus(@Param('id') id: string, @Body() body: UpdateEscrowStatusDto) {
    return this.escrowService.updatePaymentStatus(id, body)
  }

  @Get('ratings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findRatings() {
    return this.escrowService.findRatings()
  }

  @Get('ratings/user/:userId')
  async findRatingsByUser(@Param('userId') userId: string) {
    return this.escrowService.findRatingsByUser(userId)
  }

  @Post('ratings')
  async createRating(@Body() body: CreateMarketplaceRatingDto, @Req() req: Request & { user: JwtUser }) {
    return this.escrowService.createRating({ ...body, reviewerId: req.user.sub })
  }
}
