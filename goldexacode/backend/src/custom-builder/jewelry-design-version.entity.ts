import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('jewelry_design_versions')
export class JewelryDesignVersion {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'design_id' })
  designId: string

  @Column()
  version: number

  @Column('simple-json')
  changes: unknown

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'total_price' })
  totalPrice: number

  @Column({ name: 'model_url', nullable: true })
  modelUrl: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
