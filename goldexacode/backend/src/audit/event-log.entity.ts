import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('event_logs')
export class EventLog {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ nullable: true })
  aggregate_type: string | null

  @Column({ nullable: true })
  aggregate_id: string | null

  @Column('simple-json', { default: {} })
  payload: unknown

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
