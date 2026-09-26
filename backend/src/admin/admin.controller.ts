import { Controller, Get, UseGuards, Query, Patch, Param, Body } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AdminService } from './admin.service'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { Permissions } from '../common/decorators/permissions.decorator'
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateCommunityPostStatusDto,
  UpdateProductDto,
  UpdateSettingDto,
} from './admin.dto'
import { EscrowPaymentStatus } from '../escrow/escrow-payment.entity'
import { OrdersService } from '../orders/orders.service'
import { PayoutRequest } from '../wallet/payout-request.entity'
import { CommunityService } from '../community/community.service'
import { DesignPostStatus } from '../community/design-post.entity'

@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly ordersService: OrdersService,
    @InjectRepository(PayoutRequest) private readonly payoutRepository: Repository<PayoutRequest>,
    private readonly communityService: CommunityService,
  ) {}

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_REPORTS')
  @Get('stats')
  async getStats() {
    return this.adminService.getDashboardStats()
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_REPORTS')
  @Get('reports')
  async getReports() {
    return this.adminService.getReports()
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_USERS')
  @Get('users')
  async getUsers(@Query('limit') limit?: string, @Query('role') role?: string) {
    return this.adminService.listUsers(this.parseLimit(limit), role)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('BLOCK_USER')
  @Patch('users/:id/status')
  async setUserBlocked(@Param('id') id: string, @Body() body: { isBlocked: boolean }) {
    return this.adminService.setUserBlocked(id, Boolean(body.isBlocked))
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_ALL_ORDERS')
  @Get('orders')
  async getOrders(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.adminService.listOrders(this.parseLimit(limit), status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('UPDATE_ORDER_STATUS')
  @Patch('orders/:id/status')
  async updateOrderStatus(@Param('id') id: string, @Body() body: UpdateOrderStatusDto) {
    return this.adminService.updateOrderStatus(id, body.status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_ALL_ORDERS')
  @Get('products')
  async getProducts(@Query('limit') limit?: string) {
    return this.adminService.listProducts(this.parseLimit(limit))
  }

  @UseGuards(PermissionsGuard)
  @Permissions('UPDATE_ANY_PRODUCT')
  @Patch('products/:id')
  async updateProduct(@Param('id') id: string, @Body() body: UpdateProductDto) {
    return this.adminService.updateProduct(id, body)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_PAYMENTS')
  @Get('payments')
  async getPayments(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.adminService.listPayments(this.parseLimit(limit), status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_PAYMENTS')
  @Get('refunds')
  async getRefunds(@Query('limit') limit?: string, @Query('status') status?: string) {
    return this.adminService.listRefunds(this.parseLimit(limit), status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_PAYMENTS')
  @Get('payouts')
  async getPayouts(@Query('limit') limit?: string, @Query('status') status?: string) {
    const take = this.parseLimit(limit)
    return this.payoutRepository.find({
      where: status ? { status: status as PayoutRequest['status'] } : undefined,
      order: { createdAt: 'DESC' },
      take,
    })
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_PAYMENTS')
  @Get('escrow/disputes')
  async getEscrowDisputes(@Query('limit') limit?: string) {
    return this.adminService.listDisputedEscrows(this.parseLimit(limit))
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MODERATE_COMMUNITY')
  @Get('community/posts')
  async getCommunityPosts(@Query('status') status?: string) {
    return this.communityService.findPostsForAdmin(status as DesignPostStatus | undefined)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MODERATE_COMMUNITY')
  @Patch('community/posts/:id/status')
  async updateCommunityPostStatus(@Param('id') id: string, @Body() body: UpdateCommunityPostStatusDto) {
    return this.communityService.updatePostStatus(id, body.status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('REFUND_PAYMENT')
  @Patch('escrow/:id/resolve')
  async resolveEscrow(
    @Param('id') id: string,
    @Body() body: { status: EscrowPaymentStatus; resolutionNote: string },
  ) {
    return this.adminService.resolveEscrowDispute(id, body.status, body.resolutionNote)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VERIFY_PAYMENT')
  @Patch('payments/:id/verify')
  async verifyPayment(@Param('id') id: string) {
    return this.adminService.verifyPayment(id)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('REFUND_PAYMENT')
  @Patch('payments/:id/refund')
  async refundPayment(@Param('id') id: string, @Body() body: UpdatePaymentStatusDto) {
    return this.adminService.refundPayment(id, body.status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('REFUND_PAYMENT')
  @Patch('refunds/:id')
  async resolveOrderRefund(@Param('id') id: string, @Body() body: { status: 'approved' | 'rejected' }) {
    return this.ordersService.resolveRefund(id, body.status)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MANAGE_SETTINGS')
  @Get('settings')
  async getSettings() {
    return this.adminService.listSettings()
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MANAGE_SETTINGS')
  @Patch('settings')
  async updateSetting(@Body() body: UpdateSettingDto) {
    return this.adminService.updateSetting(body.key, body.value, body.description)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MANAGE_SETTINGS')
  @Get('content')
  async getContent() {
    return this.adminService.listContentPages()
  }

  @UseGuards(PermissionsGuard)
  @Permissions('MANAGE_SETTINGS')
  @Patch('content/:id')
  async updateContent(@Param('id') id: string, @Body() body: Partial<Record<string, unknown>>) {
    return this.adminService.updateContentPage(id, body)
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_AUDIT_LOG')
  @Get('audit-logs')
  async getAuditLogs(@Query('limit') limit?: string) {
    return this.adminService.listAuditLogs(this.parseLimit(limit))
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_AUDIT_LOG')
  @Get('roles')
  async getRoles() {
    return this.adminService.listRoles()
  }

  @UseGuards(PermissionsGuard)
  @Permissions('VIEW_AUDIT_LOG')
  @Get('permissions')
  async getPermissions() {
    return this.adminService.listPermissions()
  }

  private parseLimit(limit?: string) {
    const parsed = Number(limit || 100)
    return Number.isFinite(parsed) && parsed > 0 ? Math.min(Math.floor(parsed), 500) : 100
  }
}
