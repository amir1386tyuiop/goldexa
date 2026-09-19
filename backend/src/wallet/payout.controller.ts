import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { CreatePayoutDto, ResolvePayoutDto } from './create-payout.dto'
import { PayoutRequestStatus } from './payout-request.entity'
import { PayoutService } from './payout.service'

@Controller('wallet/payouts')
@UseGuards(JwtAuthGuard)
export class PayoutController {
  constructor(private readonly payoutService: PayoutService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    if (req.user.role !== 'admin' && !req.user.roleNames?.includes('admin') && req.user.sub !== userId) {
      throw new ForbiddenException('دسترسی به برداشت کاربر دیگر مجاز نیست')
    }
    return this.payoutService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreatePayoutDto, @Req() req: Request & { user: JwtUser }) {
    return this.payoutService.create(req.user.sub, body)
  }

  @Patch(':id/approve')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async approve(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.payoutService.resolve(id, req.user.sub, PayoutRequestStatus.APPROVED, {})
  }

  @Patch(':id/reject')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async reject(@Param('id') id: string, @Body() body: ResolvePayoutDto, @Req() req: Request & { user: JwtUser }) {
    return this.payoutService.resolve(id, req.user.sub, PayoutRequestStatus.REJECTED, body)
  }

  @Patch(':id/paid')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async paid(@Param('id') id: string, @Body() body: ResolvePayoutDto, @Req() req: Request & { user: JwtUser }) {
    return this.payoutService.resolve(id, req.user.sub, PayoutRequestStatus.PAID, body)
  }
}
