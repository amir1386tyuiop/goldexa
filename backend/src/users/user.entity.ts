import { CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Column } from 'typeorm'
import { UserRoleMapping } from '../auth/user-role-mapping.entity'

export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  DESIGNER = 'designer',
  ADMIN = 'admin',
  EXPERT = 'expert',
  PREMIUM = 'premium',
  GROUP_BUYER = 'group_buyer',
  CUSTOMER = 'customer',
}

export enum UserLevel {
  STANDARD = 'standard',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  name: string

  @Column({ unique: true })
  phone: string

  @Column({ nullable: true })
  email: string | null

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.BUYER,
  })
  role: UserRole

  @Column({
    type: 'enum',
    enum: UserLevel,
    default: UserLevel.STANDARD,
  })
  level: UserLevel

  @Column({ nullable: true })
  avatar: string | null

  @Column({ name: 'is_blocked', default: false })
  isBlocked: boolean

  @Column('simple-json', { default: [] })
  addresses: unknown[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @Column({ default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date

  @OneToMany(() => UserRoleMapping, (mapping) => mapping.user)
  roleMappings: UserRoleMapping[]
}
