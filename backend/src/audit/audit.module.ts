import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuditController } from './audit.controller'
import { AuditService } from './audit.service'
import { AuditLog } from './audit-log.entity'
import { EventLog } from './event-log.entity'
import { NotificationPreference } from './notification-preference.entity'
import { SystemSetting } from './system-setting.entity'

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, EventLog, SystemSetting, NotificationPreference])],
  controllers: [AuditController],
  providers: [AuditService],
})
export class AuditModule {}
