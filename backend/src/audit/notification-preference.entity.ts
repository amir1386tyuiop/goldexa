import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('notification_preferences')
export class NotificationPreference {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ default: true, name: 'in_app' })
  inApp: boolean

  @Column({ default: false, name: 'sms' })
  sms: boolean

  @Column({ default: true, name: 'push' })
  push: boolean

  @Column({ default: false, name: 'email' })
  email: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
