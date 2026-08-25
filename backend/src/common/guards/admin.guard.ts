import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtUser } from './jwt-auth.guard'

/**
 * Requires the caller to be an admin. Use for privileged operations such as
 * changing a user's role or level (which must never be self-service). Runs
 * after JwtAuthGuard, which populates request.user.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: JwtUser }>()
    if (!request.user) {
      throw new UnauthorizedException('برای این عملیات باید وارد حساب شوید')
    }
    if (request.user.role !== 'admin' && !request.user.roleNames?.includes('admin')) {
      throw new ForbiddenException('این عملیات فقط برای مدیر مجاز است')
    }
    return true
  }
}
