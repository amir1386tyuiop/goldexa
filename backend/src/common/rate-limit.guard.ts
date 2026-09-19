import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { CacheService } from './cache.service'

export interface RateLimitOptions {
  limit: number
  windowMs: number
}

export const RATE_LIMIT_KEY = 'rate_limit_options'

/** Decorator: @RateLimit({ limit, windowMs }) on a route or controller. */
export const RateLimit = (options: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, options)

/**
 * Dependency-free, in-memory sliding-window rate limiter. Keyed by client IP +
 * route, it protects sensitive endpoints (OTP request, login) from brute force
 * without pulling in an external package. For a multi-instance deployment this
 * should be backed by Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, private readonly cache: CacheService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<RateLimitOptions | undefined>(RATE_LIMIT_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!options) return true

    const request = context.switchToHttp().getRequest()
    const ip =
      request.ip ||
      request.headers?.['x-forwarded-for'] ||
      request.socket?.remoteAddress ||
      'unknown'
    const routeKey = `${request.method}:${request.route?.path ?? request.url}:${ip}`

    const allowed = await this.cache.consumeRateLimit(routeKey, options.limit, options.windowMs)
    if (!allowed) {
      throw new HttpException('تعداد درخواست‌ها بیش از حد مجاز است. کمی بعد دوباره تلاش کنید.', HttpStatus.TOO_MANY_REQUESTS)
    }
    return true
  }
}
