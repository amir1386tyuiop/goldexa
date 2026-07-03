import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('order_cancellations')
export class OrderCancellation {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column()
  reason: string

  @Column({ default: 'pending', name: 'status' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
