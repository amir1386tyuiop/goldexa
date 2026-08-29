import { api } from './client'

/** Administrative API facade. */
export const adminApi = {
  getAdminStats: api.getAdminStats,
  getAdminUsers: api.getAdminUsers,
  getAdminOrders: api.getAdminOrders,
  updateAdminOrderStatus: api.updateAdminOrderStatus,
  getAdminProducts: api.getAdminProducts,
  updateAdminProduct: api.updateAdminProduct,
  getAdminPayments: api.getAdminPayments,
  verifyAdminPayment: api.verifyAdminPayment,
  refundAdminPayment: api.refundAdminPayment,
  getAdminSettings: api.getAdminSettings,
  updateAdminSetting: api.updateAdminSetting,
  getAdminContent: api.getAdminContent,
  updateAdminContent: api.updateAdminContent,
  getAdminAuditLogs: api.getAdminAuditLogs,
  getAdminRoles: api.getAdminRoles,
  getAdminPermissions: api.getAdminPermissions,
  syncAdminRoles: api.syncAdminRoles,
}

export type { AuditLog, ContentPage, Order, PaymentTransaction, Permission, Product, Role, SystemSetting, User } from '@/types'
