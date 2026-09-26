import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DesignChallenge } from './design-challenge.entity'
import { DesignPost } from './design-post.entity'
import { DesignComment } from './design-comment.entity'
import { DesignVote } from './design-vote.entity'
import { CommunityController } from './community.controller'
import { CommunityService } from './community.service'
import { User } from '../users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([DesignChallenge, DesignPost, DesignComment, DesignVote, User])],
  controllers: [CommunityController],
  providers: [CommunityService],
  exports: [CommunityService],
})
export class CommunityModule {}
