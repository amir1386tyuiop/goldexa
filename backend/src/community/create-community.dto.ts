import { Type } from 'class-transformer'
import { IsDate, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator'
import { DesignChallengeStatus } from './design-challenge.entity'

export class CreateDesignChallengeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  theme: string
  @Type(() => Date)
  @IsDate()
  startDate: Date
  @Type(() => Date)
  @IsDate()
  endDate: Date
  @IsOptional()
  @IsString()
  @MaxLength(80)
  rewardType?: string | null
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1_000_000_000_000)
  rewardValue?: number
  @IsOptional()
  @IsEnum(DesignChallengeStatus)
  status?: DesignChallengeStatus
}

export class CreateDesignPostDto {
  @IsOptional()
  @IsUUID()
  userId: string
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  userName: string
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  title: string
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  description: string
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  imageUrl?: string | null
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  modelUrl?: string | null
  @IsOptional()
  @IsUUID()
  challengeId?: string | null
}

export class CreateDesignCommentDto {
  @IsOptional()
  @IsUUID()
  userId: string
  @IsOptional()
  @IsString()
  @MaxLength(160)
  userName: string
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  body: string
}

export class LikeDesignPostDto {
  @IsUUID()
  userId: string
}

export class SetDesignChallengeWinnerDto {
  @IsUUID()
  winnerPostId: string
}
