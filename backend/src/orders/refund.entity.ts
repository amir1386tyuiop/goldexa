import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column('decimal', { precision: 15, scale: 2 })
  amount: number

  @Column()
  reason: string

  @Column({ default: 'pending', name: 'status' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
