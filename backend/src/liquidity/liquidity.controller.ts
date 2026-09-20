import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { LiquidityService } from './liquidity.service'
import { CreateBuyerRequestDto, CreateLiquidityRequestDto, CreateSellRecommendationDto } from './create-liquidity.dto'

@Controller('liquidity')
@UseGuards(JwtAuthGuard)
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Get('requests/user/:userId')
  async findRequests(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    this.assertOwnerOrAdmin(userId, req.user)
    return this.liquidityService.findRequests(userId)
  }

  @Post('requests')
  async createRequest(@Body() body: CreateLiquidityRequestDto, @Req() req: Request & { user: JwtUser }) {
    return this.liquidityService.createRequest({ ...body, userId: req.user.sub })
  }

  @Patch('requests/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateRequestStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.liquidityService.updateRequestStatus(id, body.status)
  }

  @Get('recommendations/user/:userId')
  async findRecommendations(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    this.assertOwnerOrAdmin(userId, req.user)
    return this.liquidityService.findRecommendations(userId)
  }

  @Post('recommendations')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createRecommendation(@Body() body: CreateSellRecommendationDto) {
    return this.liquidityService.createRecommendation(body)
  }

  @Get('buyer-requests')
  async findBuyerRequests() {
    return this.liquidityService.findBuyerRequests()
  }

  @Post('buyer-requests')
  async createBuyerRequest(@Body() body: CreateBuyerRequestDto, @Req() req: Request & { user: JwtUser }) {
    return this.liquidityService.createBuyerRequest({ ...body, userId: req.user.sub })
  }

  private assertOwnerOrAdmin(userId: string, user: JwtUser): void {
    if (user.role !== 'admin' && !user.roleNames?.includes('admin') && user.sub !== userId) {
      throw new ForbiddenException('دسترسی به داده‌ی کاربر دیگر مجاز نیست')
    }
  }
}
