import { CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Role } from './role.entity'
import { Permission } from './permission.entity'

@Entity('role_permissions')
export class RolePermissionMapping {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId: string

  @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
  permissionId: string

  @ManyToOne(() => Role, (role) => role.permissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'role_id' })
  role: Role

  @ManyToOne(() => Permission, (permission) => permission.roles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission: Permission

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
