import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { GroupBuyingGroup } from './group-buying-group.entity'
import { GroupBuyingItem } from './group-buying-item.entity'
import { GroupBuyingMember } from './group-buying-member.entity'
import { User } from '../users/user.entity'
import { GroupBuyingController } from './group-buying.controller'
import { GroupBuyingService } from './group-buying.service'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [TypeOrmModule.forFeature([GroupBuyingGroup, GroupBuyingItem, GroupBuyingMember, User]), WalletModule],
  controllers: [GroupBuyingController],
  providers: [GroupBuyingService],
  exports: [GroupBuyingService],
})
export class GroupBuyingModule {}
