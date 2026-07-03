import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column()
  status: string

  @Column({ nullable: true })
  note: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
