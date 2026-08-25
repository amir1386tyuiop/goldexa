import { Body, Controller, ForbiddenException, Get, Param, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { WalletService } from './wallet.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import {
  CreateWalletDto,
  WalletDepositDto,
  WalletGoldBuyDto,
  WalletGoldSellDto,
  WalletPaymentDto,
  WalletTransactionDto,
} from './create-wallet.dto'

// RBAC §10/§11: wallet is a financial resource — require login and enforce that
// a user can only reach their own wallet (admins may reach any). userId is read
// from the route param or request body by OwnerGuard.
@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Req() request: Request & { user: JwtUser }) {
    this.assertTarget(userId, request.user)
    return this.walletService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateWalletDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.create(body)
  }

  @Post('deposit')
  @UseGuards(AdminGuard)
  async deposit(@Body() body: WalletDepositDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.deposit(body)
  }

  @Post('payment')
  @UseGuards(AdminGuard)
  async payment(@Body() body: WalletPaymentDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.payment(body)
  }

  @Post('gold/buy')
  async buyGold(@Body() body: WalletGoldBuyDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.buyGold(body)
  }

  @Post('gold/sell')
  async sellGold(@Body() body: WalletGoldSellDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.sellGold(body)
  }

  @Post('transactions')
  @UseGuards(AdminGuard)
  async createTransaction(@Body() body: WalletTransactionDto, @Req() request: Request & { user: JwtUser }) {
    body.userId = this.resolveTarget(body.userId, request.user)
    return this.walletService.createTransaction(body)
  }

  @Get('user/:userId/transactions')
  async findTransactions(@Param('userId') userId: string, @Req() request: Request & { user: JwtUser }) {
    this.assertTarget(userId, request.user)
    return this.walletService.findTransactions(userId)
  }

  @Get('user/:userId/reconcile')
  async reconcile(@Param('userId') userId: string, @Req() request: Request & { user: JwtUser }) {
    this.assertTarget(userId, request.user)
    return this.walletService.reconcile(userId)
  }

  private resolveTarget(target: string | undefined, user: JwtUser) {
    if (user.role === 'admin' || user.roleNames?.includes('admin')) return target ?? user.sub
    if (target && target !== user.sub) this.assertTarget(target, user)
    return user.sub
  }

  private assertTarget(target: string, user: JwtUser) {
    if (user.role !== 'admin' && !user.roleNames?.includes('admin') && target !== user.sub) {
      throw new ForbiddenException('دسترسی به کیف پول کاربر دیگر مجاز نیست')
    }
  }
}
