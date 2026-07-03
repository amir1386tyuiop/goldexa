import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { RoleService } from '../../auth/role.service'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private jwtService: JwtService,
    private roleService: RoleService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const roles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()])

    if (!roles?.length) {
      return true
    }

    const request = context.switchToHttp().getRequest<Request>()
    const user = this.extractUser(request)

    if (!user) {
      throw new UnauthorizedException('برای دسترسی ادمین باید وارد حساب شوید')
    }

    const hasRole = await this.roleService.hasRole(user.sub, user.role)
    const hasAnyRequestedRole = roles.includes(user.role)

    if (!hasAnyRequestedRole && !hasRole) {
      throw new UnauthorizedException('دسترسی به این بخش فقط برای نقش‌های مجاز است')
    }

    return true
  }

  private extractUser(request: Request): { sub: string; role?: string } | null {
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
