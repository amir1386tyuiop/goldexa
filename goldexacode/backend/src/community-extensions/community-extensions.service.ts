import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ChallengeReward } from './challenge-reward.entity'
import { DesignSave } from './design-save.entity'
import { UserBadge } from './user-badge.entity'
import { UserFollow } from './user-follow.entity'
import {
  AwardBadgeDto,
  AwardChallengeRewardDto,
  FollowUserDto,
  SaveDesignDto,
} from './create-community-extensions.dto'

@Injectable()
export class CommunityExtensionsService {
  constructor(
    @InjectRepository(UserFollow)
    private followRepository: Repository<UserFollow>,
    @InjectRepository(DesignSave)
    private saveRepository: Repository<DesignSave>,
    @InjectRepository(UserBadge)
    private badgeRepository: Repository<UserBadge>,
    @InjectRepository(ChallengeReward)
    private rewardRepository: Repository<ChallengeReward>,
  ) {}

  async findFollows(userId: string): Promise<UserFollow[]> {
    return this.followRepository.findBy({ followerId: userId })
  }

  async follow(data: FollowUserDto): Promise<UserFollow> {
    return this.followRepository.save(this.followRepository.create(data))
  }

  async findSaves(userId: string): Promise<DesignSave[]> {
    return this.saveRepository.findBy({ userId })
  }

  async save(data: SaveDesignDto): Promise<DesignSave> {
    return this.saveRepository.save(
      this.saveRepository.create({
        ...data,
        postId: data.postId ?? null,
        designId: data.designId ?? null,
      }),
    )
  }

  async findBadges(userId: string): Promise<UserBadge[]> {
    return this.badgeRepository.findBy({ userId })
  }

  async awardBadge(data: AwardBadgeDto): Promise<UserBadge> {
    return this.badgeRepository.save(
      this.badgeRepository.create({
        ...data,
        description: data.description ?? null,
        icon_url: data.iconUrl ?? null,
      }),
    )
  }

  async findChallengeRewards(challengeId: string): Promise<ChallengeReward[]> {
    return this.rewardRepository.findBy({ challengeId })
  }

  async awardChallengeReward(data: AwardChallengeRewardDto): Promise<ChallengeReward> {
    return this.rewardRepository.save(
      this.rewardRepository.create({
        ...data,
        postId: data.postId ?? null,
        rewardValue: data.rewardValue ?? 0,
      }),
    )
  }
}
