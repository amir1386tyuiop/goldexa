import { Controller, Get, UseGuards, Query, Patch, Param, Body } from '@nestjs/common'
import { AdminService } from './admin.service'
import { PermissionsGuard } from '../common/guards/permissions.guard'
import { Permissions } from '../common/decorators/permissions.decorator'
import {
  UpdateOrderStatusDto,
  UpdatePaymentStatusDto,
  UpdateProductDto,
  UpdateSettingDto,
} from './admin.dto'

@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
    return Number.isFinite(parsed) ? parsed : 100
  }
}
