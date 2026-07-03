import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'order_id' })
  orderId: string

  @Column({ nullable: true })
  carrier: string | null

  @Column({ name: 'tracking_code', nullable: true })
  trackingCode: string | null

  @Column({ default: 'registered', name: 'status' })
  status: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
