import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm'
import { RolePermissionMapping } from './role-permission-mapping.entity'

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  code: string

  @Column({ nullable: true })
  resource: string | null

  @Column({ nullable: true })
  action: string | null

  @Column({ nullable: true })
  description: string | null

  @OneToMany(() => RolePermissionMapping, (mapping) => mapping.permission)
  roles: RolePermissionMapping[]

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
