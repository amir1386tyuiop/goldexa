import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { OrdersService } from './orders.service'
import { OrderStatus } from './order.entity'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
import { CreateOrderDto } from './create-order.dto'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  private scope(req: AuthenticatedRequest) {
    return {
      userId: req.user.sub,
      isAdmin: req.user.role === 'admin' || req.user.roleNames?.includes('admin') === true,
    }
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.cancelOrder(id, scope.userId, scope.isAdmin)
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findAll(scope.userId, scope.isAdmin)
  }

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findByUser(scope.isAdmin ? userId : scope.userId)
  }

  @Post()
  async create(@Body() body: CreateOrderDto, @Req() req: AuthenticatedRequest) {
    return this.ordersService.createOrder(body, req.user.sub)
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findOne(id, scope.userId, scope.isAdmin)
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async updateStatus(@Param('id') id: string, @Body('status') status: OrderStatus, @Req() req: AuthenticatedRequest) {
    return this.ordersService.updateStatus(id, status, req.user.sub, true)
  }

  @Get(':id/status-history')
  async getStatusHistory(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findStatusHistory(id, scope.userId, scope.isAdmin)
  }

  @Post(':id/status-history')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async addStatusHistory(
    @Param('id') id: string,
    @Body() body: { status: string; note?: string | null },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.addStatusHistory(id, body.status, body.note, req.user.sub, true)
  }

  @Get(':id/shipments')
  async getShipments(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findShipments(id, scope.userId, scope.isAdmin)
  }

  @Post(':id/shipments')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createShipment(
    @Param('id') id: string,
    @Body() body: { carrier?: string | null; trackingCode?: string | null },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.createShipment(id, body.carrier, body.trackingCode, req.user.sub, true)
  }

  @Get(':id/invoices')
  async getInvoices(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findInvoices(id, scope.userId, scope.isAdmin)
  }

  @Post(':id/invoices')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createInvoice(
    @Param('id') id: string,
    @Body() body: { totalAmount: number; pdfUrl?: string | null },
    @Req() req: AuthenticatedRequest,
  ) {
    return this.ordersService.createInvoice(id, body.totalAmount, body.pdfUrl, req.user.sub, true)
  }

  @Get(':id/refunds')
  async getRefunds(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findRefunds(id, scope.userId, scope.isAdmin)
  }

  @Post(':id/refunds')
  async requestRefund(
    @Param('id') id: string,
    @Body() body: { amount: number; reason: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const scope = this.scope(req)
    return this.ordersService.requestRefund(id, body.amount, body.reason, scope.userId, scope.isAdmin)
  }

  @Get(':id/cancellations')
  async getCancellations(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.findCancellations(id, scope.userId, scope.isAdmin)
  }

  @Post(':id/cancellations')
  async requestCancellation(@Param('id') id: string, @Body() body: { reason: string }, @Req() req: AuthenticatedRequest) {
    const scope = this.scope(req)
    return this.ordersService.requestCancellation(id, body.reason, scope.userId, scope.isAdmin)
  }
}
