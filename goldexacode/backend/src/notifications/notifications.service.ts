import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Notification, NotificationChannel } from './notification.entity'
import { CreateNotificationDto } from './create-notification.dto'

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
  ) {}

  async findByUser(userId: string): Promise<Notification[]> {
    return this.notificationRepository.findBy({ userId })
  }

  async create(data: CreateNotificationDto): Promise<Notification> {
    return this.notificationRepository.save(
      this.notificationRepository.create({
        ...data,
        userId: data.userId ?? null,
        channel: data.channel || NotificationChannel.IN_APP,
        isRead: false,
        metadata: data.metadata ?? null,
        readAt: null,
      }) as Notification,
    )
  }

  async markRead(id: string): Promise<Notification | null> {
    await this.notificationRepository.update(id, { isRead: true, readAt: new Date() })
    return this.notificationRepository.findOneBy({ id })
  }
}
