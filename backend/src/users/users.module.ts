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

@Module({
  imports: [TypeOrmModule.forFeature([User, KycProfile, OtpSession, PublicProfile, UserAddress, UserBankAccount, UserProfile])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
