import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator'
import { RoleService } from '../../auth/role.service'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissions = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    if (!permissions?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const user = this.extractUser(request)

    if (!user) {
      throw new UnauthorizedException('برای دسترسی ادمین باید وارد حساب شوید')
    }

    const hasAllPermissions = await Promise.all(
      permissions.map((permission) => this.roleService.hasPermission(user.sub, permission)),
    )

    if (hasAllPermissions.every(Boolean)) {
      return true
    }

    throw new UnauthorizedException('دسترسی لازم برای انجام این عملیات را ندارید')
  }

  private extractUser(request: Request): { sub: string } | null {
    const header = request.headers.authorization

    if (!header?.startsWith('Bearer ')) {
      return null
    }

    try {
      return this.jwtService.verify(header.replace('Bearer ', ''))
    } catch {
      return null
    }
  }
}
