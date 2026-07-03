import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { CommunityExtensionsController } from './community-extensions.controller'
import { CommunityExtensionsService } from './community-extensions.service'
import { ChallengeReward } from './challenge-reward.entity'
import { DesignSave } from './design-save.entity'
import { UserBadge } from './user-badge.entity'
import { UserFollow } from './user-follow.entity'

@Module({
  imports: [TypeOrmModule.forFeature([UserFollow, DesignSave, UserBadge, ChallengeReward])],
  controllers: [CommunityExtensionsController],
  providers: [CommunityExtensionsService],
})
export class CommunityExtensionsModule {}
