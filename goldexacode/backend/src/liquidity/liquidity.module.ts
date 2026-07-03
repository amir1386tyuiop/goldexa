import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LiquidityController } from './liquidity.controller'
import { LiquidityService } from './liquidity.service'
import { BuyerRequest } from './buyer-request.entity'
import { LiquidityRequest } from './liquidity-request.entity'
import { SellRecommendation } from './sell-recommendation.entity'

@Module({
  imports: [TypeOrmModule.forFeature([LiquidityRequest, SellRecommendation, BuyerRequest])],
  controllers: [LiquidityController],
  providers: [LiquidityService],
})
export class LiquidityModule {}
