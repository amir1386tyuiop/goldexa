export class CreateAuditLogDto {
  userId?: string | null
  action: string
  entityType?: string | null
  entityId?: string | null
  metadata?: unknown
}

export class CreateEventLogDto {
  name: string
  aggregateType?: string | null
  aggregateId?: string | null
  payload?: unknown
}

export class UpsertSystemSettingDto {
  key: string
  value: unknown
  description?: string | null
}

export class UpdateNotificationPreferenceDto {
  inApp?: boolean
  sms?: boolean
  push?: boolean
  email?: boolean
}
