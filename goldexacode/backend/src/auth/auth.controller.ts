import { Controller, Post, Body, UseGuards } from '@nestjs/common'
import { AuthService } from './auth.service'
import { LoginDto, RefreshTokenDto, RequestOtpDto, AssignRoleDto, AssignPermissionDto } from './auth.dto'
import { RoleService } from './role.service'
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard'

@Controller('auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly roleService: RoleService,
  ) {}

  // Max 5 OTP requests per phone/IP per minute (brute-force protection).
  @Post('request-otp')
  @RateLimit({ limit: 5, windowMs: 60_000 })
  async requestOtp(@Body() body: RequestOtpDto) {
    return this.authService.requestOtp(body)
  }

  // Max 10 login attempts per IP per minute.
  @Post('login')
  @RateLimit({ limit: 10, windowMs: 60_000 })
  async login(@Body() body: LoginDto) {
    return this.authService.login(body)
  }

  @Post('refresh')
  async refresh(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body)
  }

  // Stateless JWT: logout is completed on the client by discarding the tokens.
  @Post('logout')
  logout() {
    return { success: true, message: 'با موفقیت خارج شدید' }
  }

  @Post('roles/sync')
  async syncRoles() {
    return this.roleService.upsertAdminPermissions()
  }

  @Post('roles/assign')
  async assignRole(@Body() body: AssignRoleDto) {
    return this.roleService.assignRole(body.userId, body.roleName)
  }

  @Post('roles/permission/assign')
  async assignPermission(@Body() body: AssignPermissionDto) {
    return this.roleService.assignPermission(body.roleName, body.permissionCode)
  }
}
