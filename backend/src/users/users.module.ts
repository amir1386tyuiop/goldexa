import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { User } from './user.entity'
import { KycProfile } from './kyc-profile.entity'
import { OtpSession } from './otp-session.entity'
import { PublicProfile } from './public-profile.entity'
import { UserAddress } from './user-address.entity'
import { UserBankAccount } from './user-bank-account.entity'
import { UserProfile } from './user-profile.entity'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { JwtModule } from '@nestjs/jwt'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OwnerGuard } from '../common/guards/owner.guard'
import { AdminGuard } from '../common/guards/admin.guard'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, KycProfile, OtpSession, PublicProfile, UserAddress, UserBankAccount, UserProfile]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtAuthGuard, OwnerGuard, AdminGuard],
  exports: [UsersService],
})
export class UsersModule {}
