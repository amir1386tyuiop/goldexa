import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { RolePermissionMapping } from './role-permission-mapping.entity'
import { UserRoleMapping } from './user-role-mapping.entity'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  name: string

  @Column({ nullable: true })
  description: string | null

  @OneToMany(() => RolePermissionMapping, (mapping) => mapping.role)
  permissions: RolePermissionMapping[]

  @OneToMany(() => UserRoleMapping, (mapping) => mapping.role)
  users: UserRoleMapping[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
