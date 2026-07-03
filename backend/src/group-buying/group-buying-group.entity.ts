import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

export enum GroupBuyingStatus {
  DRAFT = 'draft',
  OPEN = 'open',
  PAID = 'paid',
  CANCELLED = 'cancelled',
  COMPLETED = 'completed',
}

export enum GroupBuyingPaymentMode {
  LEADER = 'leader',
  MEMBER = 'member',
}

export enum GroupBuyingMemberStatus {
  INVITED = 'invited',
  JOINED = 'joined',
  PAID = 'paid',
  LEFT = 'left',
}

@Entity('group_buying_groups')
export class GroupBuyingGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'leader_id' })
  leaderId: string

  @Column({ name: 'leader_name' })
  leaderName: string

  @Column()
  title: string

  @Column({
    type: 'enum',
    enum: GroupBuyingStatus,
    default: GroupBuyingStatus.DRAFT,
  })
  status: GroupBuyingStatus

  @Column({
    type: 'enum',
    enum: GroupBuyingPaymentMode,
    default: GroupBuyingPaymentMode.MEMBER,
    name: 'payment_mode',
  })
  paymentMode: GroupBuyingPaymentMode

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'target_amount' })
  targetAmount: number

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'discount_rate' })
  discountRate: number

  @Column({ name: 'invite_code', unique: true })
  inviteCode: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
