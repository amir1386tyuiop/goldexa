import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum NotificationChannel {
  IN_APP = 'in_app',
  SMS = 'sms',
  PUSH = 'push',
  EMAIL = 'email',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', nullable: true })
  userId: string | null

  @Column()
  type: string

  @Column()
  title: string

  @Column('text')
  message: string

  @Column({
    type: 'enum',
    enum: NotificationChannel,
    default: NotificationChannel.IN_APP,
  })
  channel: NotificationChannel

  @Column({ default: false, name: 'is_read' })
  isRead: boolean

  @Column('simple-json', { nullable: true })
  metadata: unknown

  @Column({ name: 'read_at', nullable: true })
  readAt: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
