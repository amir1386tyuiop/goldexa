import { Body, Controller, Get, Param, Post } from '@nestjs/common'
import { CommunityExtensionsService } from './community-extensions.service'
import {
  AwardBadgeDto,
  AwardChallengeRewardDto,
  FollowUserDto,
  SaveDesignDto,
} from './create-community-extensions.dto'

@Controller('community-extensions')
export class CommunityExtensionsController {
  constructor(private readonly communityExtensionsService: CommunityExtensionsService) {}

  @Get('follows/:userId')
  async findFollows(@Param('userId') userId: string) {
    return this.communityExtensionsService.findFollows(userId)
  }

  @Post('follows')
  async follow(@Body() body: FollowUserDto) {
    return this.communityExtensionsService.follow(body)
  }

  @Get('saves/:userId')
  async findSaves(@Param('userId') userId: string) {
    return this.communityExtensionsService.findSaves(userId)
  }

  @Post('saves')
  async save(@Body() body: SaveDesignDto) {
    return this.communityExtensionsService.save(body)
  }

  @Get('badges/:userId')
  async findBadges(@Param('userId') userId: string) {
    return this.communityExtensionsService.findBadges(userId)
  }

  @Post('badges')
  async awardBadge(@Body() body: AwardBadgeDto) {
    return this.communityExtensionsService.awardBadge(body)
  }

  @Get('challenge-rewards/:challengeId')
  async findChallengeRewards(@Param('challengeId') challengeId: string) {
    return this.communityExtensionsService.findChallengeRewards(challengeId)
  }

  @Post('challenge-rewards')
  async awardChallengeReward(@Body() body: AwardChallengeRewardDto) {
    return this.communityExtensionsService.awardChallengeReward(body)
  }
}
