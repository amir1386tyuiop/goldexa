import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('gemstone_library')
export class GemstoneLibrary {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column()
  type: string

  @Column({ nullable: true })
  color: string | null

  @Column('decimal', { precision: 12, scale: 2, name: 'price_per_carat' })
  pricePerCarat: number

  @Column({ default: 0 })
  stock: number

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
