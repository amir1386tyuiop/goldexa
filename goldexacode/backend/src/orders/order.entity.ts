import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum OrderStatus {
  PENDING = 'pending',
  PAID = 'paid',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum PaymentMethod {
  ONLINE = 'online',
  WALLET = 'wallet',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true, name: 'order_number' })
  orderNumber: string

  @Column({ name: 'user_id' })
  userId: string

  @Column('simple-json')
  items: unknown[]

  @Column('decimal', { precision: 15, scale: 2, name: 'total_amount' })
  totalAmount: number

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'shipping_cost' })
  shippingCost: number

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus

  @Column('simple-json')
  address: unknown

  @Column({ nullable: true, name: 'tracking_code' })
  trackingCode: string | null

  @Column({
    type: 'enum',
    enum: PaymentMethod,
    default: PaymentMethod.ONLINE,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date
}
