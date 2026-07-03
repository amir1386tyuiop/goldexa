import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { EscrowService } from './escrow.service'
import {
  CreateEscrowPaymentDto,
  CreateMarketplaceRatingDto,
  UpdateEscrowStatusDto,
} from './create-escrow.dto'

@Controller('escrow')
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Get('payments')
  async findPayments() {
    return this.escrowService.findPayments()
  }

  @Get('payments/:id')
  async findPayment(@Param('id') id: string) {
    return this.escrowService.findPayment(id)
  }

  @Post('payments')
  async createPayment(@Body() body: CreateEscrowPaymentDto) {
    return this.escrowService.createPayment(body)
  }

  @Patch('payments/:id/status')
  async updatePaymentStatus(@Param('id') id: string, @Body() body: UpdateEscrowStatusDto) {
    return this.escrowService.updatePaymentStatus(id, body)
  }

  @Get('ratings')
  async findRatings() {
    return this.escrowService.findRatings()
  }

  @Get('ratings/user/:userId')
  async findRatingsByUser(@Param('userId') userId: string) {
    return this.escrowService.findRatingsByUser(userId)
  }

  @Post('ratings')
  async createRating(@Body() body: CreateMarketplaceRatingDto) {
    return this.escrowService.createRating(body)
  }
}
