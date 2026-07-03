import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { WalletService } from './wallet.service'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OwnerGuard } from '../common/guards/owner.guard'
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
@UseGuards(JwtAuthGuard, OwnerGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.walletService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateWalletDto) {
    return this.walletService.create(body)
  }

  @Post('deposit')
  async deposit(@Body() body: WalletDepositDto) {
    return this.walletService.deposit(body)
  }

  @Post('payment')
  async payment(@Body() body: WalletPaymentDto) {
    return this.walletService.payment(body)
  }

  @Post('gold/buy')
  async buyGold(@Body() body: WalletGoldBuyDto) {
    return this.walletService.buyGold(body)
  }

  @Post('gold/sell')
  async sellGold(@Body() body: WalletGoldSellDto) {
    return this.walletService.sellGold(body)
  }

  @Post('transactions')
  async createTransaction(@Body() body: WalletTransactionDto) {
    return this.walletService.createTransaction(body)
  }

  @Get('user/:userId/transactions')
  async findTransactions(@Param('userId') userId: string) {
    return this.walletService.findTransactions(userId)
  }

  @Get('user/:userId/reconcile')
  async reconcile(@Param('userId') userId: string) {
    return this.walletService.reconcile(userId)
  }
}
