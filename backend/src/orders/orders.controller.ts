import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { OrdersService } from './orders.service'
import { OrderStatus } from './order.entity'
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard'
import { OwnerGuard } from '../common/guards/owner.guard'
import { CreateOrderDto } from './create-order.dto'

// Orders are user-scoped: require login and enforce ownership on userId routes.
@Controller('orders')
@UseGuards(JwtAuthGuard, OwnerGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // POST /orders/:id/cancel — cancel an order (API spec §10; only pre-completion).
  @Post(':id/cancel')
  async cancel(@Param('id') id: string) {
    return this.ordersService.updateStatus(id, OrderStatus.CANCELLED)
  }

  @Get()
  async findAll() {
    return this.ordersService.findAll()
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.ordersService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(body)
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id)
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus) {
    return this.ordersService.updateStatus(id, status)
  }

  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string) {
    return this.ordersService.findStatusHistory(id)
  }

  @Post(':id/status-history')
  async addStatusHistory(
    @Param('id') id: string,
    @Body() body: { status: string; note?: string | null },
  ) {
    return this.ordersService.addStatusHistory(id, body.status, body.note)
  }

  @Get(':id/shipments')
  async getShipments(@Param('id') id: string) {
    return this.ordersService.findShipments(id)
  }

  @Post(':id/shipments')
  async createShipment(
    @Param('id') id: string,
    @Body() body: { carrier?: string | null; trackingCode?: string | null },
  ) {
    return this.ordersService.createShipment(id, body.carrier, body.trackingCode)
  }

  @Get(':id/invoices')
  async getInvoices(@Param('id') id: string) {
    return this.ordersService.findInvoices(id)
  }

  @Post(':id/invoices')
  async createInvoice(
    @Param('id') id: string,
    @Body() body: { totalAmount: number; pdfUrl?: string | null },
  ) {
    return this.ordersService.createInvoice(id, body.totalAmount, body.pdfUrl)
  }

  @Get(':id/refunds')
  async getRefunds(@Param('id') id: string) {
    return this.ordersService.findRefunds(id)
  }

  @Post(':id/refunds')
  async requestRefund(@Param('id') id: string, @Body() body: { amount: number; reason: string }) {
    return this.ordersService.requestRefund(id, body.amount, body.reason)
  }

  @Get(':id/cancellations')
  async getCancellations(@Param('id') id: string) {
    return this.ordersService.findCancellations(id)
  }

  @Post(':id/cancellations')
  async requestCancellation(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.ordersService.requestCancellation(id, body.reason)
  }
}
