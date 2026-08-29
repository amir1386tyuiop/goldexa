import { Body, Controller, Get, Patch, Post, Req, UseGuards } from '@nestjs/common'
import type { Request } from 'express'
import { JwtAuthGuard, JwtUser } from '../common/guards/jwt-auth.guard'
import { AdminGuard } from '../common/guards/admin.guard'
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
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findLogs() {
    return this.auditService.findLogs()
  }

  @Post('logs')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createLog(@Body() body: CreateAuditLogDto) {
    return this.auditService.createLog(body)
  }

  @Get('events')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findEvents() {
    return this.auditService.findEvents()
  }

  @Post('events')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async createEvent(@Body() body: CreateEventLogDto) {
    return this.auditService.createEvent(body)
  }

  @Get('settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async findSettings() {
    return this.auditService.findSettings()
  }

  @Post('settings')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async upsertSetting(@Body() body: UpsertSystemSettingDto) {
    return this.auditService.upsertSetting(body)
  }

  @Get('notification-preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async findNotificationPreferences(@Req() req: Request & { user: JwtUser }) {
    return this.auditService.findNotificationPreferences(req.user.sub)
  }

  @Patch('notification-preferences/:userId')
  @UseGuards(JwtAuthGuard)
  async updateNotificationPreferences(
    @Req() req: Request & { user: JwtUser },
    @Body() body: UpdateNotificationPreferenceDto,
  ) {
    return this.auditService.updateNotificationPreferences(req.user.sub, body)
  }
}
