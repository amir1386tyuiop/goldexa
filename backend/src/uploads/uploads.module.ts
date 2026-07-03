import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UploadsController } from './uploads.controller'
import { RoleService } from '../auth/role.service'
import { Role } from '../auth/role.entity'
import { Permission } from '../auth/permission.entity'
import { UserRoleMapping } from '../auth/user-role-mapping.entity'
import { RolePermissionMapping } from '../auth/role-permission-mapping.entity'
import { User } from '../users/user.entity'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    // The permissions guard resolves a user's permissions from the RBAC tables.
    TypeOrmModule.forFeature([Role, Permission, UserRoleMapping, RolePermissionMapping, User]),
  ],
  controllers: [UploadsController],
  providers: [RoleService],
})
export class UploadsModule {}
