import { ForbiddenException, Injectable } from '@nestjs/common'
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

  async markRead(id: string, userId?: string, isAdmin = false): Promise<Notification | null> {
    const notification = await this.notificationRepository.findOneBy({ id })
    if (notification && userId && !isAdmin && notification.userId !== userId) {
      throw new ForbiddenException('به این اعلان دسترسی ندارید')
    }
    await this.notificationRepository.update(id, { isRead: true, readAt: new Date() })
    return this.notificationRepository.findOneBy({ id })
  }
}
