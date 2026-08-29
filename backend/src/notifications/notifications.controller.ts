import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { Request } from 'express'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './create-notification.dto'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'

type AuthenticatedRequest = Request & { user: JwtUser }

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async findByUser(@Req() req: AuthenticatedRequest) {
    return this.notificationsService.findByUser(req.user.sub)
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async create(@Body() body: CreateNotificationDto) {
    return this.notificationsService.create(body)
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id/read')
  async markRead(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.notificationsService.markRead(id, req.user.sub, isAdmin(req.user))
  }
}

function isAdmin(user: JwtUser): boolean {
  return user.role === 'admin' || user.roleNames?.includes('admin') === true
}
