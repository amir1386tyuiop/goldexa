import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GroupBuyingGroup } from './group-buying-group.entity'
import { GroupBuyingItem } from './group-buying-item.entity'
import { GroupBuyingMember } from './group-buying-member.entity'
import { User } from '../users/user.entity'
import { GroupBuyingController } from './group-buying.controller'
import { GroupBuyingService } from './group-buying.service'
import { WalletModule } from '../wallet/wallet.module'
import { PricingModule } from '../pricing/pricing.module'
import { Product } from '../products/product.entity'

@Module({
  imports: [TypeOrmModule.forFeature([GroupBuyingGroup, GroupBuyingItem, GroupBuyingMember, User, Product]), WalletModule, PricingModule],
  controllers: [GroupBuyingController],
  providers: [GroupBuyingService],
  exports: [GroupBuyingService],
})
export class GroupBuyingModule {}
