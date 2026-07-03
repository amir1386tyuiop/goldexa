import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id', nullable: true })
  userId: string | null

  @Column()
  action: string

  @Column({ nullable: true })
  entity_type: string | null

  @Column({ nullable: true })
  entity_id: string | null

  @Column('simple-json', { default: {} })
  metadata: unknown

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
