import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum DiscountType {
  PERCENT = 'percent',
  FIXED = 'fixed',
}

@Entity('discount_codes')
export class DiscountCode {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  code: string

  @Column('text', { nullable: true })
  description: string | null

  @Column({
    type: 'enum',
    enum: DiscountType,
    default: DiscountType.PERCENT,
    name: 'discount_type',
  })
  discountType: DiscountType

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'discount_value' })
  discountValue: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'min_purchase' })
  minPurchase: number

  @Column({ name: 'expires_at', nullable: true })
  expiresAt: Date | null

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
