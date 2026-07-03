import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('group_buying_items')
export class GroupBuyingItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'group_id' })
  groupId: string

  @Column({ name: 'product_id' })
  productId: string

  @Column()
  name: string

  @Column({ default: 1 })
  quantity: number

  @Column('decimal', { precision: 15, scale: 2, name: 'unit_price' })
  unitPrice: number

  @Column('decimal', { precision: 15, scale: 2, name: 'total_price' })
  totalPrice: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
