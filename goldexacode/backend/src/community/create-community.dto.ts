export class CreateDesignChallengeDto {
  title: string
  description: string
  theme: string
  startDate: Date
  endDate: Date
  rewardType?: string | null
  rewardValue?: number
  status?: string
}

export class CreateDesignPostDto {
  userId: string
  userName: string
  title: string
  description: string
  imageUrl?: string | null
  modelUrl?: string | null
  challengeId?: string | null
}

export class CreateDesignCommentDto {
  userId: string
  userName: string
  body: string
}

export class LikeDesignPostDto {
  userId: string
}

export class SetDesignChallengeWinnerDto {
  winnerPostId: string
}
