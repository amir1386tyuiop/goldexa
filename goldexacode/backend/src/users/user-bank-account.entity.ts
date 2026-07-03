import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('user_bank_accounts')
export class UserBankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'bank_name' })
  bankName: string

  @Column({ name: 'account_number_hash' })
  accountNumberHash: string

  @Column({ name: 'account_holder', nullable: true })
  accountHolder: string | null

  @Column({ default: false, name: 'is_default' })
  isDefault: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
