import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { Request } from 'express'

export interface JwtUser {
  sub: string
  role: string
  roleNames?: string[]
  permissions?: string[]
  phone?: string
}

/**
 * Requires a valid JWT and attaches the decoded payload to request.user.
 * Use on any endpoint that must not be reachable anonymously.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: JwtUser }>()
    const header = request.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('برای این عملیات باید وارد حساب شوید')
    }
    try {
      const user = this.jwtService.verify<JwtUser>(header.slice(7))
      if (!user?.sub || typeof user.sub !== 'string' || !user.role) {
        throw new UnauthorizedException('توکن نامعتبر است')
      }
      request.user = user
      return true
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error
      }
      throw new UnauthorizedException('توکن نامعتبر یا منقضی شده است')
    }
  }
}
