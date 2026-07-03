import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { User } from '../users/user.entity'
import { Role } from './role.entity'

@Entity('user_roles')
export class UserRoleMapping {
  @PrimaryColumn({ name: 'user_id', type: 'uuid' })
  userId: string

  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string

  @ManyToOne(() => User, (user) => user.roleMappings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User

  @ManyToOne(() => Role, (role) => role.users, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
