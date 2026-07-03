import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  Activity,
  BarChart3,
  Box,
  Brain,
  CreditCard,
  FileText,
  Gavel,
  LayoutGrid,
  Package,
  Plus,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
  Wand2,
  Bell,
} from 'lucide-react'
import { dashboardStats, tasks } from '@/data/mockData'
import { formatPrice, getAuctionStatusBadge, getAuctionStatusText, getPaymentBadge, getPaymentStatusText, getPriorityText, getStatusText, getTaskStatusText } from '@/utils/helpers'
import { api } from '@/api/client'
import { AiEnginePanel } from './AiEnginePage'
import type { Auction, Order, PaymentTransaction, Product, Role, SystemSetting, User, Permission } from '@/types'

interface AdminStats {
  totalUsers: number
  totalOrders: number
  totalProducts: number
  totalAuctions: number
  activeAuctions: number
  todayOrders: number
  totalRevenue: number
  todayRevenue: number
  auctionRevenue: number
  totalPaymentTransactions: number
  totalCategories: number
  totalWallets: number
  totalPricingRules: number
  totalLiquidityRequests: number
  totalArModels: number
  totalContentPages: number
  totalAuditLogs: number
  totalFollows: number
  latestGoldPrice: {
    type: string
    value: number
    change: number
    changePercent: number
    updatedAt: string
  } | null
}

const menuItems = [
  { id: 'dashboard', icon: <BarChart3 className="h-5 w-5" />, label: 'داشبورد' },
  { id: 'products', icon: <Package className="h-5 w-5" />, label: 'محصولات' },
  { id: 'orders', icon: <ShoppingCart className="h-5 w-5" />, label: 'سفارشات' },
  { id: 'payments', icon: <CreditCard className="h-5 w-5" />, label: 'پرداخت‌ها' },
  { id: 'auctions', icon: <Gavel className="h-5 w-5" />, label: 'مزایده‌ها' },
  { id: 'users', icon: <Users className="h-5 w-5" />, label: 'کاربران' },
  { id: 'roles', icon: <ShieldCheck className="h-5 w-5" />, label: 'نقش‌ها' },
  { id: 'ai', icon: <Brain className="h-5 w-5" />, label: 'هوش مصنوعی' },
  { id: 'reports', icon: <FileText className="h-5 w-5" />, label: 'گزارش‌ها' },
  { id: 'settings', icon: <SlidersHorizontal className="h-5 w-5" />, label: 'تنظیمات' },
]

const fallbackStats: AdminStats = {
  totalUsers: dashboardStats.totalUsers,
  totalOrders: dashboardStats.totalOrders,
  totalProducts: dashboardStats.activeProducts,
  totalAuctions: 0,
  activeAuctions: 0,
  todayOrders: dashboardStats.todayOrders,
  totalRevenue: dashboardStats.totalRevenue,
  todayRevenue: dashboardStats.todayRevenue,
  auctionRevenue: 0,
  totalPaymentTransactions: 0,
  totalCategories: 0,
  totalWallets: 0,
  totalPricingRules: 0,
  totalLiquidityRequests: 0,
  totalArModels: 0,
  totalContentPages: 0,
  totalAuditLogs: 0,
  totalFollows: 0,
  latestGoldPrice: null,
}

export function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [search, setSearch] = useState('')

  const { data: stats = fallbackStats } = useQuery<AdminStats>({
    queryKey: ['admin-stats'],
    queryFn: api.getAdminStats,
    initialData: fallbackStats,
  })

  const { data: adminUsers = [] } = useQuery<User[]>({
    queryKey: ['admin-panel-users'],
    queryFn: () => api.getAdminUsers(100),
    initialData: [],
  })

  const { data: adminOrders = [] } = useQuery<Order[]>({
    queryKey: ['admin-panel-orders'],
    queryFn: () => api.getAdminOrders(100),
    initialData: [],
  })

  const { data: adminProducts = [] } = useQuery<Product[]>({
    queryKey: ['admin-panel-products'],
    queryFn: () => api.getAdminProducts(100),
    initialData: [],
  })

  const { data: payments = [] } = useQuery<PaymentTransaction[]>({
    queryKey: ['admin-payments'],
    queryFn: () => api.getAdminPayments(100),
    initialData: [],
  })

  const { data: settings = [] } = useQuery<SystemSetting[]>({
    queryKey: ['admin-settings'],
    queryFn: api.getAdminSettings,
    initialData: [],
  })

  const { data: roles = [] } = useQuery<Role[]>({
    queryKey: ['admin-roles'],
    queryFn: api.getAdminRoles,
    initialData: [],
  })

  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['admin-permissions'],
    queryFn: api.getAdminPermissions,
    initialData: [],
  })

  const { data: auctions = [] } = useQuery<Auction[]>({
    queryKey: ['admin-auctions'],
    queryFn: api.getAuctions,
    initialData: [],
  })

  const filteredProducts = useMemo(() => {
    if (!search) return adminProducts
    const keyword = search.toLowerCase()
    return adminProducts.filter(
      (product) =>
        product.name.toLowerCase().includes(keyword) ||
        product.description.toLowerCase().includes(keyword)
    )
  }, [adminProducts, search])

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <aside className="card p-5 h-fit lg:col-span-1 bg-navy-900 text-white">
            <h2 className="text-gold-300 font-bold mb-4 text-sm">پنل مدیریت</h2>
            <nav className="space-y-1">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-right px-4 py-3 rounded-xl text-sm transition-all flex items-center gap-3 ${
                    activeTab === item.id
                      ? 'bg-gold-500/20 text-gold-300'
                      : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="lg:col-span-4">
            {activeTab === 'dashboard' && (
              <>
                <DashboardStats stats={stats} />
                <div className="card p-6 mb-6">
                  <h2 className="text-xl font-bold mb-4">وضعیت تسک‌های MVP</h2>
                  <div className="space-y-3">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50"
                      >
                        <div>
                          <h3 className="font-bold text-sm mb-1">{task.title}</h3>
                          <p className="text-xs text-muted-foreground">{task.description}</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`badge ${getPriorityBadge(task.priority)}`}>
                            {getPriorityText(task.priority)}
                          </span>
                          <span className={`badge ${getStatusBadge(task.status)}`}>
                            {getTaskStatusText(task.status)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <OrdersTable orders={adminOrders.slice(0, 5)} />
              </>
            )}

            {activeTab === 'products' && (
              <div className="card p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-xl font-bold">محصولات</h2>
                    <p className="text-sm text-muted-foreground">
                      مدیریت محصولات، قیمت پایه، اجرت، سود، مالیات و موجودی
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1 md:w-64">
                      <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        className="input pr-10"
                        placeholder="جستجوی محصول..."
                      />
                    </div>
                    <button className="btn btn-primary flex items-center gap-2">
                      <Plus className="h-4 w-4" />
                      محصول جدید
                    </button>
                  </div>
                </div>
                <ProductsTable products={filteredProducts} />
              </div>
            )}

            {activeTab === 'orders' && <OrdersTable orders={adminOrders} />}

            {activeTab === 'auctions' && <AuctionsTable auctions={auctions} />}

            {activeTab === 'users' && <UsersTable users={adminUsers} />}

            {activeTab === 'payments' && <PaymentsTable payments={payments} />}

            {activeTab === 'roles' && <RolesPanel roles={roles} permissions={permissions} />}

            {activeTab === 'ai' && <AiEnginePanel insidePage={false} />}

            {activeTab === 'reports' && <ReportsPanel stats={stats} orders={adminOrders} users={adminUsers} />}

            {activeTab === 'settings' && <AdminSettingsPanel settings={settings} />}
          </main>
        </div>
      </div>
    </div>
  )
}

function DashboardStats({ stats }: { stats: AdminStats }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <StatCard icon={<Users className="h-6 w-6" />} label="کاربران کل" value={stats.totalUsers} />
      <StatCard icon={<ShoppingCart className="h-6 w-6" />} label="سفارشات امروز" value={stats.todayOrders} />
      <StatCard icon={<Gavel className="h-6 w-6" />} label="مزایده‌های فعال" value={stats.activeAuctions} />
      <StatCard icon={<CreditCard className="h-6 w-6" />} label="درآمد امروز" value={`${formatPrice(stats.todayRevenue)} تومان`} />
      <StatCard icon={<Package className="h-6 w-6" />} label="محصولات فعال" value={stats.totalProducts} />
      <StatCard icon={<TrendingUp className="h-6 w-6" />} label="درآمد کل" value={`${formatPrice(stats.totalRevenue)} تومان`} />
      <StatCard icon={<CreditCard className="h-6 w-6" />} label="تراکنش‌ها" value={stats.totalPaymentTransactions} />
      <StatCard icon={<LayoutGrid className="h-6 w-6" />} label="دسته‌بندی‌ها" value={stats.totalCategories} />
      <StatCard icon={<Wallet className="h-6 w-6" />} label="کیف پولها" value={stats.totalWallets} />
      <StatCard icon={<Wand2 className="h-6 w-6" />} label="قوانین قیمت" value={stats.totalPricingRules} />
      <StatCard icon={<TrendingUp className="h-6 w-6" />} label="نقدشوندگی" value={stats.totalLiquidityRequests} />
      <StatCard icon={<Box className="h-6 w-6" />} label="مدل‌های AR" value={stats.totalArModels} />
      <StatCard icon={<FileText className="h-6 w-6" />} label="محتوا" value={stats.totalContentPages} />
      <StatCard icon={<Activity className="h-6 w-6" />} label="لاگ‌ها" value={stats.totalAuditLogs} />
      <StatCard icon={<Users className="h-6 w-6" />} label="فالوها" value={stats.totalFollows} />
    </div>
  )
}

function ProductsTable({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return <EmptyState title="محصولی یافت نشد" description="محصول جدید اضافه کنید یا فیلتر جستجو را تغییر دهید." />
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-right py-3 pr-4 font-medium text-muted-foreground">محصول</th>
            <th className="text-right py-3 font-medium text-muted-foreground">دسته</th>
            <th className="text-right py-3 font-medium text-muted-foreground">موجودی</th>
            <th className="text-right py-3 font-medium text-muted-foreground">قیمت</th>
            <th className="text-right py-3 font-medium text-muted-foreground">وضعیت</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-0">
              <td className="py-3 pr-4">
                <p className="font-bold">{product.name}</p>
                <p className="text-xs text-muted-foreground">{product.weight} گرم | {product.karat} عیار</p>
              </td>
              <td className="py-3">{getCategoryName(product.category)}</td>
              <td className="py-3">{product.stock}</td>
              <td className="py-3">{formatPrice(product.finalPrice)} تومان</td>
              <td className="py-3">
                <span className={`badge ${product.stock > 0 ? 'badge-success' : 'badge-danger'}`}>
                  {product.stock > 0 ? 'موجود' : 'ناموجود'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function OrdersTable({ orders }: { orders: Order[] }) {
  if (orders.length === 0) {
    return <EmptyState title="سفارشی ثبت نشده" description="بعد از ثبت سفارش، وضعیت پرداخت و ارسال اینجا نمایش داده می‌شود." />
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">سفارشات</h2>
        <span className="text-sm text-muted-foreground">{orders.length} سفارش</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-3 pr-4 font-medium text-muted-foreground">شماره سفارش</th>
              <th className="text-right py-3 font-medium text-muted-foreground">مشتری</th>
              <th className="text-right py-3 font-medium text-muted-foreground">مبلغ</th>
              <th className="text-right py-3 font-medium text-muted-foreground">وضعیت</th>
              <th className="text-right py-3 font-medium text-muted-foreground">پرداخت</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-bold">#{order.orderNumber || order.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">
                    {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fa-IR') : '-'}
                  </p>
                </td>
                <td className="py-3">{order.userId.slice(0, 8)}</td>
                <td className="py-3">{formatPrice(order.totalAmount)} تومان</td>
                <td className="py-3">
                  <span className={`badge ${getOrderBadge(order.status)}`}>{getStatusText(order.status)}</span>
                </td>
                <td className="py-3">{order.paymentMethod === 'online' ? 'آنلاین' : 'کیف پول'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function PaymentsTable({ payments }: { payments: PaymentTransaction[] }) {
  if (payments.length === 0) {
    return <EmptyState title="پرداختی ثبت نشده" description="تراکنش‌های پرداخت، تأیید و بازگشت وجه اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">پرداخت‌ها</h2>
        <span className="text-sm text-muted-foreground">{payments.length} تراکنش</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-3 pr-4 font-medium text-muted-foreground">تراکنش</th>
              <th className="text-right py-3 font-medium text-muted-foreground">مبلغ</th>
              <th className="text-right py-3 font-medium text-muted-foreground">روش</th>
              <th className="text-right py-3 font-medium text-muted-foreground">وضعیت</th>
              <th className="text-right py-3 font-medium text-muted-foreground">زمان</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-bold">{payment.id.slice(0, 8)}</p>
                  <p className="text-xs text-muted-foreground">کاربر {payment.userId.slice(0, 8)}</p>
                </td>
                <td className="py-3">{formatPrice(payment.amount)} تومان</td>
                <td className="py-3">{payment.paymentMethod}</td>
                <td className="py-3">
                  <span className={`badge ${getPaymentBadge(payment.status)}`}>{getPaymentStatusText(payment.status)}</span>
                </td>
                <td className="py-3">{new Date(payment.createdAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RolesPanel({ roles, permissions }: { roles: Role[]; permissions: Permission[] }) {
  const adminPermissions = permissions.filter((permission) => permission.code.startsWith('VIEW_') || permission.code.startsWith('CREATE_') || permission.code.startsWith('UPDATE_') || permission.code.startsWith('DELETE_') || permission.code.startsWith('MANAGE_') || permission.code.startsWith('REFUND_') || permission.code.startsWith('VERIFY_'))

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">نقش‌های ادمین</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roles.map((role) => (
            <div key={role.id} className="rounded-xl border border-border p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-bold">{role.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{role.description || '-'}</p>
                </div>
                <span className={`badge ${role.name === 'admin' ? 'badge-success' : 'badge-info'}`}>{role.name}</span>
              </div>
              {role.name === 'admin' && (
                <div className="flex flex-wrap gap-2 mt-4">
                  {adminPermissions.map((permission) => (
                    <span key={permission.id} className="badge badge-info text-xs">{permission.code}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">دسترسی‌های تعریف‌شده</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {permissions.map((permission) => (
            <div key={permission.id} className="rounded-xl bg-gray-50 p-3">
              <p className="font-bold text-sm">{permission.code}</p>
              <p className="text-xs text-muted-foreground mt-1">{permission.description || '-'}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function AuctionsTable({ auctions }: { auctions: Auction[] }) {
  if (auctions.length === 0) {
    return <EmptyState title="مزایده‌ای ثبت نشده" description="بعد از تعریف مزایده، وضعیت پیشنهادها و پرداخت اینجا نمایش داده می‌شود." />
  }

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">مزایده‌ها</h2>
        <span className="text-sm text-muted-foreground">{auctions.length} مزایده</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-3 pr-4 font-medium text-muted-foreground">محصول</th>
              <th className="text-right py-3 font-medium text-muted-foreground">فروشنده</th>
              <th className="text-right py-3 font-medium text-muted-foreground">قیمت فعلی</th>
              <th className="text-right py-3 font-medium text-muted-foreground">وضعیت</th>
              <th className="text-right py-3 font-medium text-muted-foreground">پایان</th>
            </tr>
          </thead>
          <tbody>
            {auctions.map((auction) => (
              <tr key={auction.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-bold">{auction.product?.name}</p>
                  <p className="text-xs text-muted-foreground">پیشنهادها: {auction.bidCount}</p>
                </td>
                <td className="py-3">{auction.sellerName}</td>
                <td className="py-3">{formatPrice(auction.currentPrice)} تومان</td>
                <td className="py-3">
                  <span className={`badge ${getAuctionStatusBadge(auction.status)}`}>{getAuctionStatusText(auction.status)}</span>
                </td>
                <td className="py-3">{new Date(auction.endsAt).toLocaleDateString('fa-IR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UsersTable({ users }: { users: User[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">کاربران</h2>
        <button className="btn btn-primary flex items-center gap-2">
          <UserCheck className="h-4 w-4" />
          کاربر جدید
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-right py-3 pr-4 font-medium text-muted-foreground">نام</th>
              <th className="text-right py-3 font-medium text-muted-foreground">موبایل</th>
              <th className="text-right py-3 font-medium text-muted-foreground">نقش</th>
              <th className="text-right py-3 font-medium text-muted-foreground">سطح</th>
              <th className="text-right py-3 font-medium text-muted-foreground">سفارش‌ها</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id} className="border-b border-border last:border-0">
                <td className="py-3 pr-4">
                  <p className="font-bold">{user.name}</p>
                  <p className="text-xs text-muted-foreground">{user.email || '-'}</p>
                </td>
                <td className="py-3">{user.phone}</td>
                <td className="py-3"><span className={`badge ${getRoleBadge(user.role)}`}>{user.role}</span></td>
                <td className="py-3">{getLevelText(user.level)}</td>
                <td className="py-3">{user.orders.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ReportsPanel({
  stats,
  orders,
  users,
}: {
  stats: AdminStats
  orders: Order[]
  users: User[]
}) {
  const paidOrders = orders.filter((order) => order.status === 'paid').length
  const conversionRate = users.length ? ((paidOrders / users.length) * 100).toFixed(1) : '۰'

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard icon={<TrendingUp className="h-6 w-6" />} label="نرخ تبدیل" value={`${conversionRate}٪`} />
        <StatCard icon={<Gavel className="h-6 w-6" />} label="کل مزایده‌ها" value={stats.totalAuctions} />
        <StatCard icon={<CreditCard className="h-6 w-6" />} label="درآمد مزایده" value={`${formatPrice(stats.auctionRevenue)} تومان`} />
        <StatCard icon={<Users className="h-6 w-6" />} label="کاربران فعال" value={users.length} />
      </div>

      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">آخرین قیمت طلا</h2>
        {stats.latestGoldPrice ? (
          <div className="p-5 rounded-2xl bg-gold-50 border border-gold-500/30">
            <p className="text-sm text-muted-foreground mb-1">آخرین قیمت ثبت‌شده</p>
            <p className="text-3xl font-black text-navy-900">{formatPrice(stats.latestGoldPrice.value)} تومان</p>
            <p className="text-xs text-muted-foreground mt-2">
              {stats.latestGoldPrice.updatedAt ? new Date(stats.latestGoldPrice.updatedAt).toLocaleString('fa-IR') : '-'}
            </p>
          </div>
        ) : (
          <EmptyState title="قیمت طلا موجود نیست" description="background job قیمت‌گذاری هنوز قیمتی ثبت نکرده است." />
        )}
      </div>
    </div>
  )
}

function AdminSettingsPanel({ settings }: { settings: SystemSetting[] }) {
  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">تنظیمات سیستم</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-right py-3 pr-4 font-medium text-muted-foreground">کلید</th>
                <th className="text-right py-3 pr-4 font-medium text-muted-foreground">مقدار</th>
                <th className="text-right py-3 font-medium text-muted-foreground">توضیح</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-b border-border last:border-0">
                  <td className="py-3 pr-4 font-bold">{setting.key}</td>
                  <td className="py-3 pr-4">{JSON.stringify(setting.value)}</td>
                  <td className="py-3">{setting.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">تنظیمات پنل مدیریت</h2>
        <div className="space-y-4">
          <ToggleRow title="تأیید سفارش‌های بالای ۵۰ میلیون" description="سفارش‌های بزرگ نیاز به تأیید مدیر ارشد داشته باشند" enabled />
          <ToggleRow title="اعلان سفارش جدید" description="مدیران با ثبت هر سفارش جدید نوتیفیکیشن دریافت کنند" enabled />
          <ToggleRow title="نمایش گزارش مالی" description="دسترسی به گزارش درآمد و تراکنش‌ها برای مدیران" enabled />
          <ToggleRow title="حالت نگهداری فروشگاه" description="فروشگاه برای کاربران عادی موقتاً بسته شود" />
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center text-gold-600">
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground mb-1">{label}</p>
        <p className="text-2xl font-black text-navy-900">{value}</p>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-gray-50">
      <Bell className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function ToggleRow({
  title,
  description,
  enabled = false,
}: {
  title: string
  description: string
  enabled?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-gray-50">
      <div>
        <p className="font-bold text-sm">{title}</p>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>
      <span
        className={`h-6 w-11 rounded-full p-1 transition-colors ${
          enabled ? 'bg-gold-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`block h-4 w-4 rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-5' : ''
          }`}
        />
      </span>
    </div>
  )
}

function getPriorityBadge(priority: string): string {
  const badges: Record<string, string> = {
    low: 'badge-gold',
    medium: 'badge-info',
    high: 'badge-warning',
    critical: 'badge-danger',
  }
  return badges[priority] || 'badge-info'
}

function getStatusBadge(status: string): string {
  const badges: Record<string, string> = {
    todo: 'badge-warning',
    'in-progress': 'badge-info',
    review: 'badge-purple',
    done: 'badge-success',
  }
  return badges[status] || 'badge-info'
}

function getOrderBadge(status: string): string {
  const badges: Record<string, string> = {
    pending: 'badge-warning',
    paid: 'badge-success',
    processing: 'badge-info',
    shipped: 'badge-warning',
    delivered: 'badge-success',
    cancelled: 'badge-danger',
  }
  return badges[status] || 'badge-info'
}

function getRoleBadge(role: string): string {
  const badges: Record<string, string> = {
    buyer: 'badge-info',
    seller: 'badge-warning',
    designer: 'badge-purple',
    admin: 'badge-danger',
    expert: 'badge-success',
    premium: 'badge-gold',
    group_buyer: 'badge-info',
    customer: 'badge-info',
  }
  return badges[role] || 'badge-info'
}

function getLevelText(level: string): string {
  const levels: Record<string, string> = {
    standard: 'استاندارد',
    bronze: 'برنزی',
    silver: 'نقره‌ای',
    gold: 'طلایی',
    platinum: 'پلاتینیوم',
    diamond: 'الماس',
  }
  return levels[level] || level
}

function getCategoryName(category: string): string {
  const categories: Record<string, string> = {
    ring: 'انگشتر',
    necklace: 'گردنبند',
    bracelet: 'دستبند',
    earring: 'گوشواره',
    pendant: 'آویز',
    custom: 'سفارشی',
  }
  return categories[category] || category
}
