import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { EscrowController } from './escrow.controller'
import { EscrowService } from './escrow.service'
import { EscrowPayment } from './escrow-payment.entity'
import { MarketplaceRating } from './marketplace-rating.entity'

@Module({
  imports: [TypeOrmModule.forFeature([EscrowPayment, MarketplaceRating])],
  controllers: [EscrowController],
  providers: [EscrowService],
})
export class EscrowModule {}
