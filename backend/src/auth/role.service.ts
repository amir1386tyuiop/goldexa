import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Permission } from './permission.entity'
import { Role } from './role.entity'
import { RolePermissionMapping } from './role-permission-mapping.entity'
import { UserRoleMapping } from './user-role-mapping.entity'
import { User, UserRole } from '../users/user.entity'

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role)
    private roleRepository: Repository<Role>,
    @InjectRepository(Permission)
    private permissionRepository: Repository<Permission>,
    @InjectRepository(UserRoleMapping)
    private userRoleMappingRepository: Repository<UserRoleMapping>,
    @InjectRepository(RolePermissionMapping)
    private rolePermissionMappingRepository: Repository<RolePermissionMapping>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async listRoles() {
    return this.roleRepository.find({ order: { name: 'ASC' } })
  }

  async findRole(name: string) {
    return this.roleRepository.findOneBy({ name })
  }

  async createRole(name: string, description?: string) {
    const existing = await this.roleRepository.findOneBy({ name })

    if (existing) {
      return existing
    }

    return this.roleRepository.save(this.roleRepository.create({ name, description }))
  }

  async listPermissions() {
    return this.permissionRepository.find({ order: { code: 'ASC' } })
  }

  async createPermission(code: string, description?: string) {
    const existing = await this.permissionRepository.findOneBy({ code })

    if (existing) {
      return existing
    }

    const [resource, ...actionParts] = code.split('_')

    return this.permissionRepository.save(
      this.permissionRepository.create({
        code,
        resource: resource.toLowerCase(),
        action: actionParts.join('_').toLowerCase(),
        description,
      }),
    )
  }

  async assignRole(userId: string, roleName: string) {
    const [user, role] = await Promise.all([
      this.userRepository.findOneBy({ id: userId }),
      this.roleRepository.findOneBy({ name: roleName }),
    ])

    if (!user) {
      throw new NotFoundException('کاربر یافت نشد')
    }

    if (!role) {
      throw new NotFoundException('نقش یافت نشد')
    }

    const exists = await this.userRoleMappingRepository.existsBy({ userId, roleId: role.id })

    if (!exists) {
      await this.userRoleMappingRepository.save({ userId, roleId: role.id })
    }

    return this.listUserRoles(userId)
  }

  async removeRole(userId: string, roleName: string) {
    const role = await this.roleRepository.findOneBy({ name: roleName })

    if (!role) {
      throw new NotFoundException('نقش یافت نشد')
    }

    await this.userRoleMappingRepository.delete({ userId, roleId: role.id })

    return this.listUserRoles(userId)
  }

  async assignPermission(roleName: string, permissionCode: string) {
    const [role, permission] = await Promise.all([
      this.roleRepository.findOneBy({ name: roleName }),
      this.permissionRepository.findOneBy({ code: permissionCode }),
    ])

    if (!role) {
      throw new NotFoundException('نقش یافت نشد')
    }

    if (!permission) {
      throw new NotFoundException('دسترسی یافت نشد')
    }

    const exists = await this.rolePermissionMappingRepository.existsBy({
      roleId: role.id,
      permissionId: permission.id,
    })

    if (!exists) {
      await this.rolePermissionMappingRepository.save({ roleId: role.id, permissionId: permission.id })
    }

    return this.listRolePermissions(roleName)
  }

  async removePermission(roleName: string, permissionCode: string) {
    const [role, permission] = await Promise.all([
      this.roleRepository.findOneBy({ name: roleName }),
      this.permissionRepository.findOneBy({ code: permissionCode }),
    ])

    if (!role) {
      throw new NotFoundException('نقش یافت نشد')
    }

    if (!permission) {
      throw new NotFoundException('دسترسی یافت نشد')
    }

    await this.rolePermissionMappingRepository.delete({ roleId: role.id, permissionId: permission.id })

    return this.listRolePermissions(roleName)
  }

  async listUserRoles(userId: string) {
    const mappings = await this.userRoleMappingRepository.find({
      where: { userId },
      relations: { role: true },
      order: { createdAt: 'DESC' },
    })

    return mappings.map((mapping) => mapping.role)
  }

  async findUserRoleNames(userId: string) {
    const roles = await this.listUserRoles(userId)
    return roles.map((role) => role.name)
  }

  async listRolePermissions(roleName: string) {
    const role = await this.roleRepository.findOne({
      where: { name: roleName },
      relations: { permissions: { permission: true } },
    })

    if (!role) {
      throw new NotFoundException('نقش یافت نشد')
    }

    return role.permissions.map((mapping) => mapping.permission)
  }

  async findUserPermissions(userId: string) {
    const permissions = await this.permissionRepository
      .createQueryBuilder('permission')
      .innerJoin('role_permissions', 'rolePermission', 'rolePermission.permission_id = permission.id')
      .innerJoin('user_roles', 'userRole', 'userRole.role_id = rolePermission.role_id')
      .where('userRole.user_id = :userId', { userId })
      .getMany()

    return permissions.map((permission) => permission.code)
  }

  async hasRole(userId: string, roleName: string) {
    return this.userRoleMappingRepository
      .createQueryBuilder('mapping')
      .innerJoin('roles', 'role', 'role.id = mapping.role_id')
      .where('mapping.user_id = :userId', { userId })
      .andWhere('role.name = :roleName', { roleName })
      .getCount()
      .then((count) => count > 0)
  }

  async hasPermission(userId: string, permissionCode: string) {
    return this.rolePermissionMappingRepository
      .createQueryBuilder('mapping')
      .innerJoin('user_roles', 'userRole', 'userRole.role_id = mapping.role_id')
      .innerJoin('permissions', 'permission', 'permission.id = mapping.permission_id')
      .where('userRole.user_id = :userId', { userId })
      .andWhere('permission.code = :permissionCode', { permissionCode })
      .getCount()
      .then((count) => count > 0)
  }

  async upsertAdminPermissions() {
    const admin = await this.createRole(
      'admin',
      'Full platform management. Full access to users, products, orders, payments, reports, settings, audit logs, and content.',
    )
    const customer = await this.createRole(
      'customer',
      'Customer role used by buyers and group buyers for purchasing, wallet, orders, and profile actions.',
    )
    const seller = await this.createRole('seller', 'Seller role used for marketplace and seller-facing product flows.')
    const designer = await this.createRole('designer', 'Designer role used for custom jewelry design services.')

    const adminPermissions = [
      ['VIEW_USERS', 'View all users'],
      ['CREATE_USER', 'Create users'],
      ['UPDATE_USER', 'Update users'],
      ['BLOCK_USER', 'Block or unblock users'],
      ['CREATE_PRODUCT', 'Create products'],
      ['UPDATE_ANY_PRODUCT', 'Update any product'],
      ['UPLOAD_BUILDER_ASSET', 'Upload custom-builder stage assets'],
      ['DELETE_PRODUCT', 'Delete products'],
      ['VIEW_ALL_ORDERS', 'View all orders'],
      ['UPDATE_ORDER_STATUS', 'Update order status'],
      ['VIEW_PAYMENTS', 'View payment transactions'],
      ['VERIFY_PAYMENT', 'Verify payments'],
      ['REFUND_PAYMENT', 'Refund payments'],
      ['VIEW_REPORTS', 'View reports and analytics'],
      ['MANAGE_SETTINGS', 'Manage system settings'],
      ['MODERATE_COMMUNITY', 'Moderate community design posts'],
      ['VIEW_AUDIT_LOG', 'View audit logs'],
    ]

    const customerPermissions = [
      ['VIEW_PROFILE', 'View own profile'],
      ['UPDATE_PROFILE', 'Update own profile'],
      ['CREATE_ORDER', 'Create orders'],
      ['VIEW_OWN_ORDERS', 'View own orders'],
      ['USE_WALLET', 'Use wallet and digital gold'],
      ['USE_PRICING', 'View pricing and quotes'],
    ]

    const sellerPermissions = [
      ['CREATE_LISTING', 'Create marketplace listings'],
      ['UPDATE_OWN_LISTING', 'Update own marketplace listings'],
      ['DELETE_OWN_LISTING', 'Delete own marketplace listings'],
      ['VIEW_OWN_ORDERS', 'View seller-related orders'],
    ]

    const designerPermissions = [
      ['CREATE_DESIGN', 'Create jewelry designs'],
      ['UPDATE_OWN_DESIGN', 'Update own jewelry designs'],
      ['VIEW_OWN_DESIGNS', 'View own jewelry designs'],
    ]

    for (const [code, description] of adminPermissions) {
      const permission = await this.createPermission(code, description)
      await this.assignPermission(admin.name, permission.code)
    }

    for (const [code, description] of customerPermissions) {
      const permission = await this.createPermission(code, description)
      await this.assignPermission(customer.name, permission.code)
    }

    for (const [code, description] of sellerPermissions) {
      const permission = await this.createPermission(code, description)
      await this.assignPermission(seller.name, permission.code)
    }

    for (const [code, description] of designerPermissions) {
      const permission = await this.createPermission(code, description)
      await this.assignPermission(designer.name, permission.code)
    }

    const adminUsers = await this.userRepository.find({ where: { role: UserRole.ADMIN } })

    for (const user of adminUsers) {
      await this.assignRole(user.id, admin.name)
    }

    const customerUsers = await this.userRepository.find({ where: { role: UserRole.BUYER } })

    for (const user of customerUsers) {
      await this.assignRole(user.id, customer.name)
    }

    const sellerUsers = await this.userRepository.find({ where: { role: UserRole.SELLER } })

    for (const user of sellerUsers) {
      await this.assignRole(user.id, seller.name)
    }

    const designerUsers = await this.userRepository.find({ where: { role: UserRole.DESIGNER } })

    for (const user of designerUsers) {
      await this.assignRole(user.id, designer.name)
    }

    return {
      roles: await this.listRoles(),
      permissions: await this.listPermissions(),
    }
  }
}
