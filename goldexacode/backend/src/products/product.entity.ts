import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

export enum ProductCategory {
  RING = 'ring',
  NECKLACE = 'necklace',
  BRACELET = 'bracelet',
  EARRING = 'earring',
  PENDANT = 'pendant',
  CUSTOM = 'custom',
}

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({
    type: 'enum',
    enum: ProductCategory,
  })
  category: ProductCategory

  @Column('text')
  description: string

  @Column('decimal', { precision: 10, scale: 2 })
  weight: number

  @Column({ type: 'int', default: 18 })
  karat: number

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  labor: number

  @Column('decimal', { precision: 5, scale: 2, default: 0 })
  profit: number

  @Column('decimal', { precision: 5, scale: 2, default: 9 })
  tax: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'base_price' })
  basePrice: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'final_price' })
  finalPrice: number

  @Column('int', { default: 0 })
  stock: number

  @Column('simple-array', { default: '' })
  images: string[]

  @Column({ default: false, name: 'is_new' })
  isNew: boolean

  @Column({ default: false, name: 'is_featured' })
  isFeatured: boolean

  @Column('decimal', { precision: 5, scale: 2, nullable: true })
  discount: number | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date
}
