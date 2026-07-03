import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { InjectRepository } from '@nestjs/typeorm'
import { createHash, randomInt } from 'crypto'
import { Repository } from 'typeorm'
import { OtpSession } from '../users/otp-session.entity'
import { User } from '../users/user.entity'
import { LoginDto, RefreshTokenDto, RequestOtpDto } from './auth.dto'
import { RoleService } from './role.service'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(OtpSession)
    private otpSessionRepository: Repository<OtpSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private roleService: RoleService,
  ) {}

  async requestOtp(data: RequestOtpDto) {
    const user = await this.userRepository.findOneBy({ phone: data.phone })

    if (!user) {
      throw new UnauthorizedException('شماره موبایل تستی معتبر نیست')
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('حساب کاربری شما مسدود شده است')
    }

    if (data.role && user.role !== data.role) {
      throw new UnauthorizedException('نقش انتخاب‌شده با شماره موبایل همخوانی ندارد')
    }

    const otp = String(randomInt(100000, 1000000))
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000)

    await this.otpSessionRepository.save(
      this.otpSessionRepository.create({
        phone: data.phone,
        code_hash: this.hashOtp(otp),
        isVerified: false,
        expiresAt,
      }),
    )

    // Only expose the OTP in the response in dev/local. In production set
    // RETURN_OTP_IN_RESPONSE=false so codes are delivered out-of-band (SMS).
    const exposeOtp = (process.env.RETURN_OTP_IN_RESPONSE ?? 'true').toLowerCase() !== 'false'

    return {
      phone: data.phone,
      ...(exposeOtp ? { otp } : {}),
      expiresAt,
      message: exposeOtp ? 'در محیط لوکال، کد OTP نمایش داده می‌شود.' : 'کد تأیید پیامک شد.',
    }
  }

  async login(data: LoginDto) {
    const user = await this.userRepository.findOneBy({ phone: data.phone })

    if (!user) {
      throw new UnauthorizedException('کاربر یافت نشد')
    }

    if (user.isBlocked) {
      throw new UnauthorizedException('حساب کاربری شما مسدود شده است')
    }

    if (data.role && user.role !== data.role) {
      throw new UnauthorizedException('نقش انتخاب‌شده با شماره موبایل همخوانی ندارد')
    }

    const validSession = await this.otpSessionRepository
      .createQueryBuilder('session')
      .where('session.phone = :phone', { phone: data.phone })
      .andWhere('session.is_verified = false')
      .andWhere('session.expires_at >= :now', { now: new Date() })
      .orderBy('session.created_at', 'DESC')
      .getOne()

    if (!validSession || validSession.code_hash !== this.hashOtp(data.otp)) {
      throw new UnauthorizedException('کد OTP نامعتبر یا منقضی شده است')
    }

    await this.otpSessionRepository.update(validSession.id, { isVerified: true })

    const roleNames = await this.roleService.findUserRoleNames(user.id)
    const permissions = await this.roleService.findUserPermissions(user.id)

    return {
      user,
      accessToken: this.generateAccessToken(user, roleNames, permissions),
      refreshToken: this.generateRefreshToken(user, roleNames, permissions),
    }
  }

  async refreshToken(data: RefreshTokenDto) {
    const payload = this.jwtService.verify<{ sub: string; role: string }>(data.refreshToken)
    const user = await this.userRepository.findOneBy({ id: payload.sub })

    if (!user) {
      throw new UnauthorizedException('توکن نامعتبر است')
    }

    const roleNames = await this.roleService.findUserRoleNames(user.id)
    const permissions = await this.roleService.findUserPermissions(user.id)

    return {
      user,
      accessToken: this.generateAccessToken(user, roleNames, permissions),
      refreshToken: this.generateRefreshToken(user, roleNames, permissions),
    }
  }

  private generateAccessToken(user: User, roleNames: string[] = [], permissions: string[] = []): string {
    return this.jwtService.sign({ sub: user.id, role: user.role, roleNames, permissions, phone: user.phone })
  }

  private generateRefreshToken(user: User, roleNames: string[] = [], permissions: string[] = []): string {
    return this.jwtService.sign(
      { sub: user.id, role: user.role, roleNames, permissions, phone: user.phone },
      { expiresIn: '30d' },
    )
  }

  private hashOtp(value: string): string {
    return createHash('sha256').update(value).digest('hex')
  }
}
