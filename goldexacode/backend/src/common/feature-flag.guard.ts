import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, SetMetadata } from '@nestjs/common'
import { Reflector } from '@nestjs/core'

export const FEATURE_FLAG_KEY = 'feature_flag_env'

/**
 * Decorator: @FeatureFlag('AI_ENGINE_ENABLED') gates a controller/route behind
 * an environment flag. The route only runs when the env var equals "true".
 */
export const FeatureFlag = (envVar: string) => SetMetadata(FEATURE_FLAG_KEY, envVar)

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const envVar = this.reflector.getAllAndOverride<string | undefined>(FEATURE_FLAG_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!envVar) return true

    const enabled = String(process.env[envVar] ?? 'false').toLowerCase() === 'true'
    if (!enabled) {
      throw new ServiceUnavailableException('این قابلیت در حال حاضر غیرفعال است')
    }
    return true
  }
}
