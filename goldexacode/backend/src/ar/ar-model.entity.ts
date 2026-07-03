import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('ar_models')
export class ArModel {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id', nullable: true })
  productId: string | null

  @Column({ name: 'design_id', nullable: true })
  designId: string | null

  @Column()
  name: string

  @Column()
  model_url: string

  @Column({ nullable: true })
  thumbnail_url: string | null

  @Column({ default: true, name: 'is_active' })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
