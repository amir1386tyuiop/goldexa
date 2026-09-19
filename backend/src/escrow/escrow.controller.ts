import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { EscrowService } from './escrow.service'
import {
  CreateEscrowPaymentDto,
  CreateMarketplaceRatingDto,
  UpdateEscrowStatusDto,
  ShipEscrowPaymentDto,
} from './create-escrow.dto'

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('payments')
  async findPayments(@Req() req: Request & { user: JwtUser }) {
    return this.escrowService.findPayments(req.user.sub, req.user.role === 'admin' || req.user.roleNames?.includes('admin') === true)
  }

  @Get('payments/:id')
  async findPayment(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.escrowService.findPayment(id, req.user.sub, req.user.role === 'admin' || req.user.roleNames?.includes('admin') === true)
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

  @Patch('payments/:id/ship')
  async markShipped(
    @Param('id') id: string,
    @Body() body: ShipEscrowPaymentDto,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.escrowService.markShipped(id, req.user.sub, body.trackingCode)
  }

  @Post('payments/:id/confirm-delivery')
  async confirmDelivery(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.escrowService.confirmDelivery(id, req.user.sub)
  }

  @Get('ratings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findRatings() {
    return this.escrowService.findRatings()
  }

  @Get('ratings/user/:userId')
  async findRatingsByUser(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    const isAdmin = req.user.role === 'admin' || req.user.roleNames?.includes('admin') === true
    return this.escrowService.findRatingsByUser(isAdmin ? userId : req.user.sub)
  }

  @Post('ratings')
  async createRating(@Body() body: CreateMarketplaceRatingDto, @Req() req: Request & { user: JwtUser }) {
    return this.escrowService.createRating({ ...body, reviewerId: req.user.sub })
  }
}
