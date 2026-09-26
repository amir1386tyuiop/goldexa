import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { CommunityService } from './community.service'
import {
  CreateDesignChallengeDto,
  CreateDesignCommentDto,
  CreateDesignPostDto,
  SetDesignChallengeWinnerDto,
} from './create-community.dto'

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('challenges')
  async findChallenges() {
    return this.communityService.findChallenges()
  }

  @Post('challenges')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createChallenge(@Body() body: CreateDesignChallengeDto) {
    return this.communityService.createChallenge(body)
  }

  @Get('posts')
  async findPosts() {
    return this.communityService.findPosts()
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(@Body() body: CreateDesignPostDto, @Req() req: Request & { user: JwtUser }) {
    return this.communityService.createPost({ ...body, userId: req.user.sub })
  }

  @Get('posts/:id/comments')
  async findComments(@Param('id') id: string) {
    return this.communityService.findComments(id)
  }

  @Post('posts/:id/comments')
  @UseGuards(JwtAuthGuard)
  async addComment(@Param('id') id: string, @Body() body: CreateDesignCommentDto, @Req() req: Request & { user: JwtUser }) {
    return this.communityService.addComment(id, { ...body, userId: req.user.sub })
  }

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async like(@Param('id') id: string, @Req() req: Request & { user: JwtUser }) {
    return this.communityService.like(id, req.user.sub)
  }

  @Patch('challenges/:id/winner')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async setWinner(@Param('id') id: string, @Body() body: SetDesignChallengeWinnerDto) {
    return this.communityService.setWinner(id, body.winnerPostId)
  }
}
