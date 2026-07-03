import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { PaymentsService } from './payments.service'
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
  async requestPayment(@Body() body: RequestPaymentDto) {
    return this.paymentsService.requestPayment(body)
  }

  @Post('zarinpal/verify')
  async verifyPayment(@Body() body: VerifyPaymentDto) {
    return this.paymentsService.verifyPayment(body)
  }

  // ZarinPal redirects the user's browser back here after payment.
  @Get('zarinpal/callback')
  async callback(@Query('Authority') authority: string, @Query('Status') status: string) {
    return this.paymentsService.verifyPayment({ authority, status })
  }

  @Get('transactions')
  async findTransactions() {
    return this.paymentsService.findTransactions()
  }

  @Get('transactions/:id')
  async findTransaction(@Param('id') id: string) {
    return this.paymentsService.findTransaction(id)
  }

  @Post('transactions')
  async createTransaction(@Body() body: CreatePaymentTransactionDto) {
    return this.paymentsService.createTransaction(body)
  }

  @Patch('transactions/:id/status')
  async updateTransactionStatus(@Param('id') id: string, @Body() body: UpdatePaymentTransactionDto) {
    return this.paymentsService.updateTransactionStatus(id, body)
  }

  @Get('orders/:orderId/tracking')
  async findOrderTracking(@Param('orderId') orderId: string) {
    return this.paymentsService.findOrderTracking(orderId)
  }

  @Post('orders/:orderId/tracking')
  async createTrackingEvent(
    @Param('orderId') orderId: string,
    @Body() body: CreateOrderTrackingEventDto,
  ) {
    return this.paymentsService.createTrackingEvent(orderId, body)
  }
}
