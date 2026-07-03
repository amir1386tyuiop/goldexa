import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { AuditLog } from './audit-log.entity'
import { EventLog } from './event-log.entity'
import { NotificationPreference } from './notification-preference.entity'
import { SystemSetting } from './system-setting.entity'
import {
  CreateAuditLogDto,
  CreateEventLogDto,
  UpdateNotificationPreferenceDto,
  UpsertSystemSettingDto,
} from './create-audit.dto'

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>,
    @InjectRepository(EventLog)
    private eventRepository: Repository<EventLog>,
    @InjectRepository(SystemSetting)
    private settingRepository: Repository<SystemSetting>,
    @InjectRepository(NotificationPreference)
    private preferenceRepository: Repository<NotificationPreference>,
  ) {}

  async findLogs(): Promise<AuditLog[]> {
    return this.auditRepository.find({ order: { createdAt: 'DESC' } })
  }

  async createLog(data: CreateAuditLogDto): Promise<AuditLog> {
    return this.auditRepository.save(
      this.auditRepository.create({
        ...data,
        userId: data.userId ?? null,
        entity_type: data.entityType ?? null,
        entity_id: data.entityId ?? null,
        metadata: data.metadata ?? {},
      }),
    )
  }

  async findEvents(): Promise<EventLog[]> {
    return this.eventRepository.find({ order: { createdAt: 'DESC' } })
  }

  async createEvent(data: CreateEventLogDto): Promise<EventLog> {
    return this.eventRepository.save(
      this.eventRepository.create({
        ...data,
        aggregate_type: data.aggregateType ?? null,
        aggregate_id: data.aggregateId ?? null,
        payload: data.payload ?? {},
      }),
    )
  }

  async findSettings(): Promise<SystemSetting[]> {
    return this.settingRepository.find()
  }

  async upsertSetting(data: UpsertSystemSettingDto): Promise<SystemSetting> {
    const existing = await this.settingRepository.findOneBy({ key: data.key })
    const setting = existing || this.settingRepository.create({ key: data.key })

    setting.value = data.value
    setting.description = data.description ?? setting.description
    return this.settingRepository.save(setting)
  }

  async findNotificationPreferences(userId: string): Promise<NotificationPreference | null> {
    return this.preferenceRepository.findOneBy({ userId })
  }

  async updateNotificationPreferences(
    userId: string,
    data: UpdateNotificationPreferenceDto,
  ): Promise<NotificationPreference> {
    const existing = await this.preferenceRepository.findOneBy({ userId })
    const preference = existing || this.preferenceRepository.create({ userId })

    preference.inApp = data.inApp ?? preference.inApp
    preference.sms = data.sms ?? preference.sms
    preference.push = data.push ?? preference.push
    preference.email = data.email ?? preference.email
    return this.preferenceRepository.save(preference)
  }
}
