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
  async verifyPayment(@Body() body: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(body)
  }

  // ZarinPal redirects the user's browser back here after payment.
  @Get('zarinpal/callback')
  async callback(@Query('Authority') authority: string, @Query('Status') status: string) {
    return this.paymentsService.verifyPayment({ authority, status })
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findTransactions() {
    return this.paymentsService.findTransactions()
  }

  @Get('transactions/:id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findTransaction(@Param('id') id: string) {
    return this.paymentsService.findTransaction(id)
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

  @Get('orders/:orderId/tracking')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findOrderTracking(@Param('orderId') orderId: string) {
    return this.paymentsService.findOrderTracking(orderId)
  }

  @Post('orders/:orderId/tracking')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createTrackingEvent(
    @Param('orderId') orderId: string,
    @Body() body: CreateOrderTrackingEventDto,
  ) {
    return this.paymentsService.createTrackingEvent(orderId, body)
  }
}
