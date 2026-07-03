import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WalletController } from './wallet.controller'
import { WalletService } from './wallet.service'
import { Wallet } from './wallet.entity'
import { WalletTransaction } from './wallet-transaction.entity'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OwnerGuard } from '../common/guards/owner.guard'

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet, WalletTransaction]),
    GoldPricingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [WalletController],
  providers: [WalletService, JwtAuthGuard, OwnerGuard],
  exports: [WalletService],
})
export class WalletModule {}
