import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'
import { GroupBuyingMemberStatus } from './group-buying-group.entity'

@Entity('group_buying_members')
export class GroupBuyingMember {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'group_id' })
  groupId: string

  @Column({ name: 'user_id' })
  userId: string

  @Column({ name: 'user_name' })
  userName: string

  @Column('decimal', { precision: 15, scale: 2, name: 'share_amount' })
  shareAmount: number

  @Column('decimal', { precision: 15, scale: 2, default: 0, name: 'paid_amount' })
  paidAmount: number

  @Column({
    type: 'enum',
    enum: GroupBuyingMemberStatus,
    default: GroupBuyingMemberStatus.INVITED,
  })
  status: GroupBuyingMemberStatus

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
