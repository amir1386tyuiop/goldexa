import { Global, Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { OwnerGuard } from './guards/owner.guard'
import { AdminGuard } from './guards/admin.guard'

/**
 * Global security module: makes JwtService and the auth/ownership guards
 * injectable everywhere, so any controller can apply @UseGuards(JwtAuthGuard,
 * OwnerGuard) without re-importing JwtModule.
 */
@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
      signOptions: { expiresIn: process.env.JWT_EXPIRES_IN || '7d' },
    }),
  ],
  providers: [JwtAuthGuard, OwnerGuard, AdminGuard],
  exports: [JwtAuthGuard, OwnerGuard, AdminGuard, JwtModule],
})
export class SecurityModule {}
