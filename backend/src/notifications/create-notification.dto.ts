import { NotificationChannel } from './notification.entity'

export class CreateNotificationDto {
  userId?: string | null
  type: string
  title: string
  message: string
  channel?: NotificationChannel
  metadata?: unknown
}
