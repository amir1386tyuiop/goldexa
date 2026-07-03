import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('product_media')
export class ProductMedia {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id' })
  productId: string

  @Column()
  type: string

  @Column()
  url: string

  @Column({ nullable: true })
  alt: string | null

  @Column({ default: 0 })
  sort_order: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
