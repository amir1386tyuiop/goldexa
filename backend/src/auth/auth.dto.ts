import { IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator'
import { UserRole } from '../users/user.entity'

export class RequestOtpDto {
  @IsNotEmpty()
  @Matches(/^09[0-9]{9}$/)
  phone: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}

export class LoginDto {
  @IsNotEmpty()
  @Matches(/^09[0-9]{9}$/)
  phone: string

  @IsNotEmpty()
  @IsString()
  otp: string

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole
}

export class RefreshTokenDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string
}

export class AssignRoleDto {
  @IsNotEmpty()
  @IsString()
  userId: string

  @IsNotEmpty()
  @IsString()
  roleName: string
}

export class AssignPermissionDto {
  @IsNotEmpty()
  @IsString()
  roleName: string

  @IsNotEmpty()
  @IsString()
  permissionCode: string
}
