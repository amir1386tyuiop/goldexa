import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto } from './create-notification.dto'

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('user/:userId')
  async findByUser(@Param('userId') userId: string) {
    return this.notificationsService.findByUser(userId)
  }

  @Post()
  async create(@Body() body: CreateNotificationDto) {
    return this.notificationsService.create(body)
  }

  @Patch(':id/read')
  async markRead(@Param('id') id: string) {
    return this.notificationsService.markRead(id)
  }
}
