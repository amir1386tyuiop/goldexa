import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('product_stones')
export class ProductStone {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id' })
  productId: string

  @Column({ name: 'stone_id' })
  stoneId: string

  @Column('decimal', { precision: 10, scale: 3, default: 0 })
  carat: number

  @Column({ nullable: true })
  position: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
