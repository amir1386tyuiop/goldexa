import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, EntityManager, Repository } from 'typeorm'
import { DesignChallenge, DesignChallengeStatus } from './design-challenge.entity'
import { DesignPost, DesignPostStatus } from './design-post.entity'
import { DesignComment } from './design-comment.entity'
import { DesignVote } from './design-vote.entity'
import { User } from '../users/user.entity'
import { UserBadge } from '../community-extensions/user-badge.entity'
import { ChallengeReward } from '../community-extensions/challenge-reward.entity'
import { WalletService } from '../wallet/wallet.service'
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(UserBadge)
    private badgeRepository: Repository<UserBadge>,
    @InjectRepository(ChallengeReward)
    private rewardRepository: Repository<ChallengeReward>,
    private readonly walletService: WalletService,
    private readonly dataSource: DataSource,
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
    return this.postRepository.find({ where: { status: DesignPostStatus.PUBLISHED }, order: { createdAt: 'DESC' } })
  }

  async findPostsForAdmin(status?: DesignPostStatus): Promise<DesignPost[]> {
    return this.postRepository.find({
      where: status ? { status } : undefined,
      order: { createdAt: 'DESC' },
    })
  }

  async updatePostStatus(id: string, status: DesignPostStatus): Promise<DesignPost> {
    const post = await this.postRepository.findOneBy({ id })

    if (!post) {
      throw new NotFoundException('طرح یافت نشد')
    }

    post.status = status
    return this.postRepository.save(post)
  }

  async findComments(postId: string): Promise<DesignComment[]> {
    return this.commentRepository.find({ where: { postId }, order: { createdAt: 'ASC' } })
  }

  async createPost(data: CreateDesignPostDto): Promise<DesignPost> {
    const user = await this.userRepository.findOneBy({ id: data.userId })

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }

    return this.postRepository.save(
      this.postRepository.create({
        ...data,
        userName: user.name,
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

    const user = await this.userRepository.findOneBy({ id: data.userId })

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }

    const comment = this.commentRepository.create({
      postId,
      userId: data.userId,
      userName: user.name,
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
    const winnerPost = await this.postRepository.findOneBy({ id: winnerPostId })
    if (!winnerPost) throw new NotFoundException('طرح برنده یافت نشد')
    await this.walletService.ensureWalletForUser(winnerPost.userId)
    const result = await this.dataSource.transaction(async (manager) => this.setWinnerInManager(manager, challengeId, winnerPostId))
    if (result.transaction && Number(result.reward.rewardValue) > 0) {
      await this.walletService.auditCommunityReward(result.transaction, result.post.userId, Number(result.reward.rewardValue))
    }
    return result.challenge
  }

  private async setWinnerInManager(manager: EntityManager, challengeId: string, winnerPostId: string) {
    const challenges = manager.getRepository(DesignChallenge)
    const posts = manager.getRepository(DesignPost)
    const rewards = manager.getRepository(ChallengeReward)
    const badges = manager.getRepository(UserBadge)
    const challenge = await challenges.findOne({ where: { id: challengeId }, lock: { mode: 'pessimistic_write' } })
    if (!challenge) throw new NotFoundException('چالش یافت نشد')
    const post = await posts.findOneBy({ id: winnerPostId })
    if (!post) throw new NotFoundException('طرح برنده یافت نشد')
    if (post.challengeId !== challengeId) throw new BadRequestException('طرح انتخاب‌شده متعلق به این چالش نیست')

    challenge.winnerPostId = winnerPostId
    challenge.status = DesignChallengeStatus.ENDED
    const savedChallenge = await challenges.save(challenge)
    let reward = await rewards.findOneBy({ challengeId, postId: winnerPostId, userId: post.userId })
    if (!reward) {
      reward = await rewards.save(rewards.create({ challengeId, postId: winnerPostId, userId: post.userId, rewardType: challenge.rewardType || 'design_challenge_winner', rewardValue: Number(challenge.rewardValue || 0) }))
    }
    let transaction: Awaited<ReturnType<WalletService['creditCommunityRewardInManager']>> | null = null
    if (Number(reward.rewardValue) > 0) {
      transaction = await this.walletService.creditCommunityRewardInManager(manager, post.userId, reward.id, Number(reward.rewardValue), `جایزه‌ی برنده‌ی چالش طراحی ${challenge.title}`)
    }
    const badgeName = `برنده چالش: ${challenge.title}`
    if (!(await badges.findOneBy({ userId: post.userId, name: badgeName }))) {
      await badges.save(badges.create({ userId: post.userId, name: badgeName, description: 'نشان برنده‌ی چالش طراحی Goldexa', icon_url: null }))
    }
    return { challenge: savedChallenge, reward, post, transaction }
  }
}
