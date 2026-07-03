import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'
import { UserRole, UserLevel } from './user.entity'

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  name: string

  @IsNotEmpty()
  @Matches(/^09[0-9]{9}$/)
  phone: string

  @IsOptional()
  @IsEmail()
  email?: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole

  @IsOptional()
  @IsEnum(UserLevel)
  level?: UserLevel
}
