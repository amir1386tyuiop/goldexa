import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DesignChallenge, DesignChallengeStatus } from './design-challenge.entity'
import { DesignPost, DesignPostStatus } from './design-post.entity'
import { DesignComment } from './design-comment.entity'
import { DesignVote } from './design-vote.entity'
import {
  CreateDesignChallengeDto,
  CreateDesignCommentDto,
  CreateDesignPostDto,
} from './create-community.dto'

@Injectable()
export class CommunityService {
  constructor(
    @InjectRepository(DesignChallenge)
    private challengeRepository: Repository<DesignChallenge>,
    @InjectRepository(DesignPost)
    private postRepository: Repository<DesignPost>,
    @InjectRepository(DesignComment)
    private commentRepository: Repository<DesignComment>,
    @InjectRepository(DesignVote)
    private voteRepository: Repository<DesignVote>,
  ) {}

  async findChallenges(): Promise<DesignChallenge[]> {
    return this.challengeRepository.find({ order: { startDate: 'DESC' } })
  }

  async createChallenge(data: CreateDesignChallengeDto): Promise<DesignChallenge> {
    return this.challengeRepository.save(
      this.challengeRepository.create({
        ...data,
        status: (data.status as DesignChallengeStatus) || DesignChallengeStatus.DRAFT,
      }) as DesignChallenge,
    )
  }

  async findPosts(): Promise<DesignPost[]> {
    return this.postRepository.find({ order: { createdAt: 'DESC' } })
  }

  async findComments(postId: string): Promise<DesignComment[]> {
    return this.commentRepository.find({ where: { postId }, order: { createdAt: 'ASC' } })
  }

  async createPost(data: CreateDesignPostDto): Promise<DesignPost> {
    return this.postRepository.save(
      this.postRepository.create({
        ...data,
        imageUrl: data.imageUrl ?? null,
        modelUrl: data.modelUrl ?? null,
        challengeId: data.challengeId ?? null,
        status: DesignPostStatus.PUBLISHED,
      }) as DesignPost,
    )
  }

  async addComment(postId: string, data: CreateDesignCommentDto): Promise<DesignComment> {
    const post = await this.postRepository.findOneBy({ id: postId })

    if (!post) {
      throw new NotFoundException('طرح یافت نشد')
    }

    const comment = this.commentRepository.create({
      postId,
      userId: data.userId,
      userName: data.userName,
      body: data.body,
    })

    post.commentsCount += 1
    await this.postRepository.save(post)
    return this.commentRepository.save(comment)
  }

  async like(postId: string, userId: string): Promise<DesignPost> {
    const post = await this.postRepository.findOneBy({ id: postId })

    if (!post) {
      throw new NotFoundException('طرح یافت نشد')
    }

    const existingVote = await this.voteRepository.findOneBy({ postId, userId })

    if (existingVote) {
      throw new BadRequestException('هر کاربر فقط یک بار می‌تواند به هر طرح رأی دهد')
    }

    await this.voteRepository.save(this.voteRepository.create({ postId, userId }))
    post.likesCount += 1
    return this.postRepository.save(post)
  }

  async setWinner(challengeId: string, winnerPostId: string): Promise<DesignChallenge> {
    const challenge = await this.challengeRepository.findOneBy({ id: challengeId })

    if (!challenge) {
      throw new NotFoundException('چالش یافت نشد')
    }

    const post = await this.postRepository.findOneBy({ id: winnerPostId })

    if (!post) {
      throw new NotFoundException('طرح برنده یافت نشد')
    }

    challenge.winnerPostId = winnerPostId
    challenge.status = DesignChallengeStatus.ENDED
    return this.challengeRepository.save(challenge)
  }
}
