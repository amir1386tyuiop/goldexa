import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
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
  @UseGuards(JwtAuthGuard)
  async follow(@Body() body: FollowUserDto, @Req() req: Request & { user: JwtUser }) {
    return this.communityExtensionsService.follow({ ...body, followerId: req.user.sub })
  }

  @Get('saves/:userId')
  @UseGuards(JwtAuthGuard)
  async findSaves(@Param('userId') userId: string, @Req() req: Request & { user: JwtUser }) {
    const isAdmin = req.user.role === 'admin' || req.user.roleNames?.includes('admin') === true
    if (!isAdmin && req.user.sub !== userId) {
      throw new ForbiddenException('دسترسی به ذخیره‌های کاربر دیگر مجاز نیست')
    }
    return this.communityExtensionsService.findSaves(userId)
  }

  @Post('saves')
  @UseGuards(JwtAuthGuard)
  async save(@Body() body: SaveDesignDto, @Req() req: Request & { user: JwtUser }) {
    return this.communityExtensionsService.save({ ...body, userId: req.user.sub })
  }

  @Get('badges/:userId')
  async findBadges(@Param('userId') userId: string) {
    return this.communityExtensionsService.findBadges(userId)
  }

  @Post('badges')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async awardBadge(@Body() body: AwardBadgeDto) {
    return this.communityExtensionsService.awardBadge(body)
  }

  @Get('challenge-rewards/:challengeId')
  async findChallengeRewards(@Param('challengeId') challengeId: string) {
    return this.communityExtensionsService.findChallengeRewards(challengeId)
  }

  @Post('challenge-rewards')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async awardChallengeReward(@Body() body: AwardChallengeRewardDto) {
    return this.communityExtensionsService.awardChallengeReward(body)
  }
}
