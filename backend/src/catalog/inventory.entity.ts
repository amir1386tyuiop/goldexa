import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('inventories')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'product_id' })
  productId: string

  @Column({ default: 0 })
  stock: number

  @Column({ default: 0, name: 'reserved_stock' })
  reservedStock: number

  @Column({ nullable: true })
  warehouse: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
