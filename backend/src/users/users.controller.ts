import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { UsersService } from './users.service'
import { UserRole, UserLevel } from './user.entity'
import { KycStatus } from './kyc-profile.entity'
import { CreateUserDto } from './create-user.dto'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { OwnerGuard, OwnerParam } from '../common/guards/owner.guard'
import { AdminGuard } from '../common/guards/admin.guard'

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // Admin-only: listing every user must not be public.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async findAll() {
    return this.usersService.findAll()
  }

  // Public: registration.
  @Post()
  async create(@Body() body: CreateUserDto) {
    return this.usersService.createUser(body)
  }

  // API spec §4: current user's profile, resolved from the JWT.
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: JwtUser }) {
    return this.usersService.findOne(req.user.sub)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  async updateMe(@Req() req: Request & { user: JwtUser }, @Body() body: Record<string, unknown>) {
    return this.usersService.upsertProfile(req.user.sub, body)
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('phone/:phone')
  async findByPhone(@Param('phone') phone: string) {
    return this.usersService.findByPhone(phone)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Get(':id')
  async findOne(@Param('id') _id: string, @Req() req: Request & { user: JwtUser }) {
    return this.usersService.findOne(req.user.sub)
  }

  // Privileged: only an admin may change a user's level or role (no self-promotion).
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/level')
  async updateLevel(@Param('id') id: string, @Body('level') level: UserLevel) {
    return this.usersService.updateLevel(id, level)
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/role')
  async updateRole(@Param('id') id: string, @Body('role') role: UserRole) {
    return this.usersService.updateRole(id, role)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Post(':id/otp-sessions')
  async createOtpSession(
    @Param('id') _id: string,
    @Req() _req: Request & { user: JwtUser },
    @Body() body: { phone: string; codeHash: string; expiresAt: Date },
  ) {
    return this.usersService.createOtpSession(body.phone, body.codeHash, body.expiresAt)
  }

  // KYC status changes are an admin/expert action.
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(':id/kyc')
  async updateKyc(@Param('id') id: string, @Body() body: { status: string; rejectionReason?: string | null }) {
    return this.usersService.updateKyc(id, body.status as KycStatus, body.rejectionReason)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Get(':id/kyc')
  async getKyc(@Param('id') _id: string, @Req() req: Request & { user: JwtUser }) {
    return this.usersService.findKyc(req.user.sub)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Get(':id/profile')
  async getProfile(@Param('id') _id: string, @Req() req: Request & { user: JwtUser }) {
    return this.usersService.findProfile(req.user.sub)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Patch(':id/profile')
  async updateProfile(
    @Param('id') _id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.upsertProfile(req.user.sub, body)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Get(':id/addresses')
  async getAddresses(@Param('id') _id: string, @Req() req: Request & { user: JwtUser }) {
    return this.usersService.findAddresses(req.user.sub)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Post(':id/addresses')
  async addAddress(
    @Param('id') _id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.addAddress(req.user.sub, body)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Patch(':id/addresses/:addressId')
  async updateAddress(
    @Param('id') _id: string,
    @Param('addressId') addressId: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.updateAddress(req.user.sub, addressId, body)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Delete(':id/addresses/:addressId')
  async removeAddress(
    @Param('id') _id: string,
    @Param('addressId') addressId: string,
    @Req() req: Request & { user: JwtUser },
  ) {
    return this.usersService.removeAddress(req.user.sub, addressId)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Get(':id/bank-accounts')
  async getBankAccounts(@Param('id') _id: string, @Req() req: Request & { user: JwtUser }) {
    return this.usersService.findBankAccounts(req.user.sub)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Post(':id/bank-accounts')
  async addBankAccount(
    @Param('id') _id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.addBankAccount(req.user.sub, body)
  }

  // Public profile is public by design (community pages).
  @Get(':id/public-profile')
  async getPublicProfile(@Param('id') id: string) {
    return this.usersService.findPublicProfile(id)
  }

  @UseGuards(JwtAuthGuard, OwnerGuard)
  @OwnerParam('id')
  @Patch(':id/public-profile')
  async updatePublicProfile(
    @Param('id') _id: string,
    @Req() req: Request & { user: JwtUser },
    @Body() body: Record<string, unknown>,
  ) {
    return this.usersService.upsertPublicProfile(req.user.sub, body)
  }
}
