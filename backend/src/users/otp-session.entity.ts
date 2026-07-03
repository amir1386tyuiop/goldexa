import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm'

@Entity('otp_sessions')
export class OtpSession {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  phone: string

  @Column()
  code_hash: string

  @Column({ default: false, name: 'is_verified' })
  isVerified: boolean

  @Column({ name: 'expires_at' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
