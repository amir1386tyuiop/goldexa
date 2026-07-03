import { CanActivate, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { JwtUser } from './jwt-auth.guard'

export const OWNER_PARAM_KEY = 'owner_param'

/**
 * Marks which request field carries the target user id. Defaults to 'userId'.
 * The OwnerGuard then ensures the caller may only touch their own data.
 */
export const OwnerParam = (field = 'userId') => SetMetadata(OWNER_PARAM_KEY, field)

/**
 * Enforces RBAC §11: a user may only access their own resources. The target
 * user id (from the route param or request body) must equal the JWT subject —
 * unless the caller is an admin, who may access any user's data. Must run after
 * JwtAuthGuard (which populates request.user).
 */
@Injectable()
export class OwnerGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const field =
      this.reflector.getAllAndOverride<string | undefined>(OWNER_PARAM_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'userId'

    const request = context.switchToHttp().getRequest<{ user?: JwtUser; params: Record<string, string>; body: Record<string, unknown> }>()
    const user = request.user
    if (!user) {
      throw new UnauthorizedException('برای این عملیات باید وارد حساب شوید')
    }
    if (user.role === 'admin') {
      return true
    }

    const target = request.params?.[field] ?? (request.body?.[field] as string | undefined)
    if (target && target !== user.sub) {
      throw new ForbiddenException('دسترسی به داده‌های کاربر دیگر مجاز نیست')
    }
    return true
  }
}
