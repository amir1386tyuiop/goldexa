import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { OtpSession } from '../users/otp-session.entity'
import { User } from '../users/user.entity'
import { Permission } from './permission.entity'
import { Role } from './role.entity'
import { RolePermissionMapping } from './role-permission-mapping.entity'
import { RoleService } from './role.service'
import { UserRoleMapping } from './user-role-mapping.entity'
import { RateLimitGuard } from '../common/rate-limit.guard'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'

@Module({
  imports: [
    TypeOrmModule.forFeature([OtpSession, User, Role, Permission, UserRoleMapping, RolePermissionMapping]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, RoleService, RateLimitGuard, JwtAuthGuard, AdminGuard],
})
export class AuthModule {}
