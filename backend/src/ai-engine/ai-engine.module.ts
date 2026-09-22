import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentModule } from '../content/content.module'
import { NotificationsModule } from '../notifications/notifications.module'
import { AiEngineController } from './ai-engine.controller'
import { AiEngineService } from './ai-engine.service'
import { OpenRouterAiClient } from './openrouter-ai.client'
import { LocalAiClient } from './local-ai.client'
import { AiPricePrediction } from './ai-price-prediction.entity'
import { AiDesignRecommendation } from './ai-design-recommendation.entity'
import { AiMarketMatch } from './ai-market-match.entity'
import { AiServiceMetric } from './ai-service-metric.entity'
import { RoleService } from '../auth/role.service'
import { Role } from '../auth/role.entity'
import { Permission } from '../auth/permission.entity'
import { UserRoleMapping } from '../auth/user-role-mapping.entity'
import { RolePermissionMapping } from '../auth/role-permission-mapping.entity'
import { User } from '../users/user.entity'
import { FeatureFlagGuard } from '../common/feature-flag.guard'
import { Product } from '../products/product.entity'
import { GoldPricingModule } from '../gold-pricing/gold-pricing.module'
import { RateLimitGuard } from '../common/rate-limit.guard'

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
    TypeOrmModule.forFeature([AiPricePrediction, AiDesignRecommendation, AiMarketMatch, AiServiceMetric, Role, Permission, UserRoleMapping, RolePermissionMapping, User, Product]),
    NotificationsModule,
    ContentModule,
    GoldPricingModule,
  ],
  controllers: [AiEngineController],
  providers: [AiEngineService, OpenRouterAiClient, LocalAiClient, RoleService, FeatureFlagGuard, RateLimitGuard],
})
export class AiEngineModule {}
