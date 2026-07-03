import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { AuditService } from './audit.service'
import {
  CreateAuditLogDto,
  CreateEventLogDto,
  UpdateNotificationPreferenceDto,
  UpsertSystemSettingDto,
} from './create-audit.dto'

@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  async findLogs() {
    return this.auditService.findLogs()
  }

  @Post('logs')
  async createLog(@Body() body: CreateAuditLogDto) {
    return this.auditService.createLog(body)
  }

  @Get('events')
  async findEvents() {
    return this.auditService.findEvents()
  }

  @Post('events')
  async createEvent(@Body() body: CreateEventLogDto) {
    return this.auditService.createEvent(body)
  }

  @Get('settings')
  async findSettings() {
    return this.auditService.findSettings()
  }

  @Post('settings')
  async upsertSetting(@Body() body: UpsertSystemSettingDto) {
    return this.auditService.upsertSetting(body)
  }

  @Get('notification-preferences/:userId')
  async findNotificationPreferences(@Param('userId') userId: string) {
    return this.auditService.findNotificationPreferences(userId)
  }

  @Patch('notification-preferences/:userId')
  async updateNotificationPreferences(
    @Param('userId') userId: string,
    @Body() body: UpdateNotificationPreferenceDto,
  ) {
    return this.auditService.updateNotificationPreferences(userId, body)
  }
}
