import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

export enum KycStatus {
  NONE = 'none',
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
}

@Entity('kyc_profiles')
export class KycProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({
    type: 'enum',
    enum: KycStatus,
    default: KycStatus.NONE,
  })
  status: KycStatus

  @Column({ name: 'full_name', nullable: true })
  fullName: string | null

  @Column({ name: 'national_code_hash', nullable: true })
  nationalCodeHash: string | null

  @Column({ nullable: true })
  document_url: string | null

  @Column({ nullable: true })
  rejection_reason: string | null

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
