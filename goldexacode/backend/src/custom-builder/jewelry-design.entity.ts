import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum JewelryDesignStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  READY_FOR_REVIEW = 'ready_for_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export enum JewelryDesignCategory {
  RING = 'ring',
  NECKLACE = 'necklace',
  BRACELET = 'bracelet',
  EARRING = 'earring',
  PENDANT = 'pendant',
}

export enum JewelryBaseType {
  SIMPLE = 'simple',
  HALF_DIAMOND = 'half_diamond',
  FULL_DIAMOND = 'full_diamond',
  STONE_CENTER = 'stone_center',
}

@Entity('jewelry_designs')
export class JewelryDesign {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'user_name' })
  userName: string

  @Column()
  title: string

  @Column({
    type: 'enum',
    enum: JewelryDesignCategory,
  })
  category: JewelryDesignCategory

  @Column({ name: 'base_type', type: 'enum', enum: JewelryBaseType, default: JewelryBaseType.SIMPLE })
  baseType: JewelryBaseType

  @Column('decimal', { precision: 10, scale: 2 })
  weight: number

  @Column({ default: 18 })
  karat: number

  @Column({ name: 'metal_color', nullable: true })
  metalColor: string | null

  @Column('simple-json', { default: [] })
  stones: unknown[]

  @Column('simple-json', { nullable: true })
  dimensions: unknown

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null

  @Column({ name: 'model_url', nullable: true })
  modelUrl: string | null

  @Column({ name: 'preview_3d_url', nullable: true })
  preview3dUrl: string | null

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'estimated_gold_price' })
  estimatedGoldPrice: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'labor_cost' })
  laborCost: number

  @Column('decimal', { precision: 15, scale: 2, default: 0 })
  profit: number

  @Column('decimal', { precision: 15, scale: 2, default: 9 })
  tax: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'total_price' })
  totalPrice: number

  @Column({
    type: 'enum',
    enum: JewelryDesignStatus,
    default: JewelryDesignStatus.DRAFT,
  })
  status: JewelryDesignStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
