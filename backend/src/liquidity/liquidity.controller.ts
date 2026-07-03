import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { LiquidityService } from './liquidity.service'
import { CreateBuyerRequestDto, CreateLiquidityRequestDto, CreateSellRecommendationDto } from './create-liquidity.dto'

@Controller('liquidity')
export class LiquidityController {
  constructor(private readonly liquidityService: LiquidityService) {}

  @Get('requests/user/:userId')
  async findRequests(@Param('userId') userId: string) {
    return this.liquidityService.findRequests(userId)
  }

  @Post('requests')
  async createRequest(@Body() body: CreateLiquidityRequestDto) {
    return this.liquidityService.createRequest(body)
  }

  @Patch('requests/:id/status')
  async updateRequestStatus(@Param('id') id: string, @Body() body: { status: string }) {
    return this.liquidityService.updateRequestStatus(id, body.status)
  }

  @Get('recommendations/user/:userId')
  async findRecommendations(@Param('userId') userId: string) {
    return this.liquidityService.findRecommendations(userId)
  }

  @Post('recommendations')
  async createRecommendation(@Body() body: CreateSellRecommendationDto) {
    return this.liquidityService.createRecommendation(body)
  }

  @Get('buyer-requests')
  async findBuyerRequests() {
    return this.liquidityService.findBuyerRequests()
  }

  @Post('buyer-requests')
  async createBuyerRequest(@Body() body: CreateBuyerRequestDto) {
    return this.liquidityService.createBuyerRequest(body)
  }
}
