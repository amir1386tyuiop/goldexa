import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { PaymentsService } from './payments.service'
import { AdminGuard } from '../common/guards/admin.guard'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import {
  CreateOrderTrackingEventDto,
  CreatePaymentTransactionDto,
  RequestPaymentDto,
  UpdatePaymentTransactionDto,
  VerifyPaymentDto,
} from './create-payment.dto'

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // --- ZarinPal gateway flow ---
  @Post('zarinpal/request')
  @UseGuards(JwtAuthGuard)
  async requestPayment(@Body() body: RequestPaymentDto, @Req() request: Request & { user: JwtUser }) {
    return this.paymentsService.requestPayment(body, request.user.sub)
  }

  @Post('zarinpal/verify')
  @UseGuards(JwtAuthGuard)
  async verifyPayment(@Body() body: VerifyPaymentDto, @Req() request: Request & { user: JwtUser }) {
    return this.paymentsService.verifyPayment(body, request.user.sub)
  }

  // ZarinPal redirects the user's browser back here after payment.
  @Get('zarinpal/callback')
  async callback(@Query('Authority') authority: string, @Query('Status') status: string) {
    return this.paymentsService.verifyPayment({ authority, status })
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async findTransactions(@Req() request: Request & { user: JwtUser }) {
    return this.paymentsService.findTransactions(request.user.sub, isAdmin(request.user))
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard)
  async findTransaction(@Param('id') id: string, @Req() request: Request & { user: JwtUser }) {
    return this.paymentsService.findTransaction(id, request.user.sub, isAdmin(request.user))
  }

  @Post('transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createTransaction(@Body() body: CreatePaymentTransactionDto) {
    return this.paymentsService.createTransaction(body)
  }

  @Patch('transactions/:id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateTransactionStatus(@Param('id') id: string, @Body() body: UpdatePaymentTransactionDto) {
    return this.paymentsService.updateTransactionStatus(id, body)
  }

  @Post('transactions/:id/refund')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async refundTransaction(@Param('id') id: string) {
    return this.paymentsService.refundTransaction(id)
  }

  @Get('orders/:orderId/tracking')
  @UseGuards(JwtAuthGuard)
  async findOrderTracking(@Param('orderId') orderId: string, @Req() request: Request & { user: JwtUser }) {
    return this.paymentsService.findOrderTracking(orderId, request.user.sub, isAdmin(request.user))
  }

  @Post('orders/:orderId/tracking')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createTrackingEvent(
    @Param('orderId') orderId: string,
    @Body() body: CreateOrderTrackingEventDto,
    @Req() request: Request & { user: JwtUser },
  ) {
    return this.paymentsService.createTrackingEvent(orderId, body, request.user.sub, isAdmin(request.user))
  }
}

function isAdmin(user: JwtUser): boolean {
  return user.role === 'admin' || user.roleNames?.includes('admin') === true
}
