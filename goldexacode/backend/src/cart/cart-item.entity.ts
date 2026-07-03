import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Cart } from './cart.entity'

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'cart_id' })
  cartId: string

  @Column({ name: 'product_id' })
  productId: string

  @Column()
  name: string

  @Column('int', { default: 1 })
  quantity: number

  @Column('decimal', { precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number

  @Column('decimal', { precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number

  @Column({ name: 'reserved_until', nullable: true })
  reservedUntil: Date | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @ManyToOne(() => Cart, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart
}
