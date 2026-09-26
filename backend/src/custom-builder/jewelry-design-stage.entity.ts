import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

export enum JewelryDesignStageStatus {
  PLANNED = 'planned',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

@Entity('jewelry_design_stages')
export class JewelryDesignStage {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'design_id' })
  designId: string

  @Column()
  title: string

  @Column({ type: 'varchar', default: JewelryDesignStageStatus.PLANNED })
  status: JewelryDesignStageStatus

  @Column({ type: 'text', nullable: true })
  note: string | null

  @Column({ name: 'image_url', nullable: true })
  imageUrl: string | null

  @Column({ name: 'model_url', nullable: true })
  modelUrl: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
