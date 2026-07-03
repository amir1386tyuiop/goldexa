import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('order_tracking_events')
export class OrderTrackingEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column()
  status: string

  @Column({ nullable: true })
  location: string | null

  @Column({ nullable: true })
  description: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
