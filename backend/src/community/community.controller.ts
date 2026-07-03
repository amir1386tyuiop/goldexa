import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { CommunityService } from './community.service'
import {
  CreateDesignChallengeDto,
  CreateDesignCommentDto,
  CreateDesignPostDto,
  LikeDesignPostDto,
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
  async createChallenge(@Body() body: CreateDesignChallengeDto) {
    return this.communityService.createChallenge(body)
  }

  @Get('posts')
  async findPosts() {
    return this.communityService.findPosts()
  }

  @Post('posts')
  async createPost(@Body() body: CreateDesignPostDto) {
    return this.communityService.createPost(body)
  }

  @Post('posts/:id/comments')
  async addComment(@Param('id') id: string, @Body() body: CreateDesignCommentDto) {
    return this.communityService.addComment(id, body)
  }

  @Post('posts/:id/like')
  async like(@Param('id') id: string, @Body() body: LikeDesignPostDto) {
    return this.communityService.like(id, body.userId)
  }

  @Patch('challenges/:id/winner')
  async setWinner(@Param('id') id: string, @Body() body: SetDesignChallengeWinnerDto) {
    return this.communityService.setWinner(id, body.winnerPostId)
  }
}
