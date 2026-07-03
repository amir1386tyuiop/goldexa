export class FollowUserDto {
  followerId: string
  followingId: string
}

export class SaveDesignDto {
  userId: string
  postId?: string | null
  designId?: string | null
}

export class AwardBadgeDto {
  userId: string
  name: string
  description?: string | null
  iconUrl?: string | null
}

export class AwardChallengeRewardDto {
  challengeId: string
  postId?: string | null
  userId: string
  rewardType: string
  rewardValue?: number
}
