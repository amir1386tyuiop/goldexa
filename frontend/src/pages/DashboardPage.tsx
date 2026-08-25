import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  User,
  Package,
  MapPin,
  CreditCard,
  Settings,
  Heart,
  Bell,
  Wallet,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice, getStatusText } from '@/utils/helpers'
import type { Order, User as UserType } from '@/types'
import { getStoredAuth } from '@/auth'

const authenticatedUser = getStoredAuth()?.user
const dashboardUserId = authenticatedUser?.id || ''

const menuItems = [
  { id: 'profile', icon: <User className="h-5 w-5" />, label: 'پروفایل' },
  { id: 'orders', icon: <Package className="h-5 w-5" />, label: 'سفارشات من' },
  { id: 'addresses', icon: <MapPin className="h-5 w-5" />, label: 'آدرس‌ها' },
  { id: 'wallet', icon: <CreditCard className="h-5 w-5" />, label: 'کیف پول' },
  { id: 'activity', icon: <Clock className="h-5 w-5" />, label: 'فعالیت‌ها' },
  { id: 'favorites', icon: <Heart className="h-5 w-5" />, label: 'علاقه‌مندی‌ها' },
  { id: 'notifications', icon: <Bell className="h-5 w-5" />, label: 'اعلان‌ها' },
  { id: 'settings', icon: <Settings className="h-5 w-5" />, label: 'تنظیمات' },
]

const dashboardMenuItems = authenticatedUser?.role === 'admin'
  ? [...menuItems, { id: 'admin', icon: <ShieldCheck className="h-5 w-5" />, label: 'پنل مدیریت' }]
  : menuItems

const roleDashboardTitle: Record<UserType['role'], string> = {
  buyer: 'داشبورد خریدار',
  seller: 'داشبورد فروشنده',
  designer: 'داشبورد طراح',
  admin: 'داشبورد مدیریت',
  expert: 'داشبورد کارشناسی',
  premium: 'داشبورد کاربر ویژه',
  group_buyer: 'داشبورد خرید گروهی',
  customer: 'داشبورد کاربر',
}

export function DashboardPage() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('profile')

  const { data: currentUser, isLoading: isUserLoading } = useQuery<UserType>({
    queryKey: ['user', dashboardUserId],
    queryFn: () => api.getUser(dashboardUserId),
    enabled: Boolean(dashboardUserId),
  })

  const { data: userOrders = [] } = useQuery({
    queryKey: ['orders', 'user', dashboardUserId],
    queryFn: () => api.getOrdersByUser(dashboardUserId),
    enabled: Boolean(dashboardUserId),
    initialData: [],
  })

  const { data: wallet } = useQuery({
    queryKey: ['wallet', dashboardUserId],
    queryFn: () => api.getWallet(dashboardUserId),
    enabled: Boolean(dashboardUserId),
  })

  const { data: goldPrices = [] } = useQuery({
    queryKey: ['gold-prices'],
    queryFn: () => api.getGoldPrices(),
    initialData: [],
  })

  const { data: walletTransactions = [] } = useQuery({
    queryKey: ['wallet-transactions', dashboardUserId],
    queryFn: () => api.getWalletTransactions(dashboardUserId),
    enabled: Boolean(dashboardUserId),
  })

  const orders = useMemo(() => {
    const normalizedOrders = userOrders.length ? userOrders : currentUser?.orders ?? []
    return normalizedOrders.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
  }, [currentUser?.orders, userOrders])

  if (isUserLoading || !currentUser) {
    return <div className="container mx-auto px-4 pt-28 pb-16 text-center text-muted-foreground">در حال دریافت اطلاعات حساب...</div>
  }

  const activeOrders = orders.filter((order) =>
    ['pending', 'paid', 'processing'].includes(order.status)
  )
  const totalPurchases = orders.reduce((total, order) => total + order.totalAmount, 0)

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <aside className="card p-5 h-fit lg:col-span-1">
            <div className="text-center pb-5 border-b border-border mb-4">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white text-3xl font-bold mx-auto mb-3">
                {currentUser.name.charAt(0)}
              </div>
              <h2 className="font-bold">{currentUser.name}</h2>
              <p className="text-sm text-gold-600 mt-1">سطح طلایی</p>
              <p className="text-xs text-muted-foreground mt-1">{currentUser.phone}</p>
            </div>

            <nav className="space-y-1">
              {dashboardMenuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === 'admin') {
                      navigate('/admin')
                      return
                    }
                    setActiveTab(item.id)
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === item.id
                      ? 'bg-gold-50 text-gold-700'
                      : 'text-muted-foreground hover:bg-gray-50'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </nav>
          </aside>

          <main className="lg:col-span-3">
            <div className="mb-6 rounded-3xl bg-gradient-to-br from-navy-900 to-navy-700 p-6 text-white">
              <p className="text-sm text-gold-200">داشبورد اختصاصی نقش</p>
              <h1 className="mt-2 text-3xl font-black">{roleDashboardTitle[currentUser.role]}</h1>
              <p className="mt-3 text-white/70">
                ورود با نقش {currentUser.role} انجام شده و دسترسی‌ها بر اساس همین نقش نمایش داده می‌شود.
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <StatBox label="سفارشات فعال" value={activeOrders.length} />
              <StatBox label="مجموع خریدها" value={`${formatPrice(totalPurchases)} تومان`} />
              <StatBox label="موجودی طلا" value={`${wallet?.goldBalanceGrams ?? 0} گرم`} />
              <StatBox label="قیمت طلای ۱۸ عیار" value={`${formatPrice(goldPrices.find((price) => price.type === 'gold18')?.value ?? 0)} تومان`} />
            </div>

            {activeTab === 'profile' && <ProfilePanel user={currentUser} />}
            {activeTab === 'orders' && <OrdersPanel orders={orders} />}
            {activeTab === 'addresses' && <AddressesPanel addresses={currentUser.addresses} />}
            {activeTab === 'wallet' && <WalletPanel wallet={wallet ?? null} />}
            {activeTab === 'activity' && <ActivityPanel transactions={walletTransactions} />}
            {activeTab === 'favorites' && <FavoritesPanel />}
            {activeTab === 'notifications' && <NotificationsPanel />}
            {activeTab === 'settings' && <SettingsPanel />}
          </main>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted-foreground mb-2">{label}</p>
      <p className="text-3xl font-black text-navy-900">{value}</p>
    </div>
  )
}

function ProfilePanel({ user }: { user: UserType }) {
  return (
    <div className="card p-6 mb-6">
      <h2 className="text-xl font-bold mb-4">اطلاعات پروفایل</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <InputField label="نام و نام خانوادگی" value={user.name} />
        <InputField label="شماره موبایل" value={user.phone} />
        <InputField label="ایمیل" value={user.email || 'example@email.com'} />
        <InputField label="سطح کاربری" value={user.level === 'gold' ? 'طلایی' : user.level} />
      </div>
    </div>
  )
}

function OrdersPanel({ orders }: { orders: Order[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">آخرین سفارشات</h2>
        <span className="text-sm text-muted-foreground">{orders.length} سفارش</span>
      </div>

      {orders.length === 0 ? (
        <EmptyState title="سفارشی ثبت نشده" description="بعد از ثبت اولین سفارش، وضعیت و کد رهگیری اینجا نمایش داده می‌شود." />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div
              key={order.id}
              className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-4 rounded-xl bg-gray-50"
            >
              <div>
                <p className="font-bold text-sm">
                  سفارش {order.orderNumber || `#${order.id.slice(0, 8)}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {order.createdAt ? new Date(order.createdAt).toLocaleDateString('fa-IR') : '-'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:justify-end">
                <span className={`badge ${getOrderBadge(order.status)}`}>{getStatusText(order.status)}</span>
                <p className="text-xs text-muted-foreground">
                  {formatPrice(order.totalAmount)} تومان
                </p>
                {order.trackingCode && (
                  <span className="text-xs text-gold-700 bg-gold-50 px-2 py-1 rounded-lg">
                    رهگیری: {order.trackingCode}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AddressesPanel({ addresses }: { addresses: UserType['addresses'] }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-4">آدرس‌ها</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {addresses.map((address) => (
          <div key={address.id} className="p-4 rounded-xl bg-gray-50 border border-border">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">{address.title}</h3>
              {address.isDefault && <span className="badge badge-success">پیش‌فرض</span>}
            </div>
            <p className="text-sm text-muted-foreground leading-7">
              {address.province}، {address.city}
              <br />
              {address.street}
              <br />
              کد پستی: {address.postalCode}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}

function WalletPanel({ wallet }: { wallet: { balance: number; goldBalanceGrams: number } | null }) {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center text-gold-600">
          <Wallet className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold">کیف پول</h2>
          <p className="text-sm text-muted-foreground">موجودی ریالی و طلای دیجیتال</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-navy-900 to-navy-700 text-white">
          <p className="text-sm text-gray-300 mb-2">موجودی فعلی</p>
          <p className="text-3xl font-black">{formatPrice(wallet?.balance ?? 0)} تومان</p>
        </div>
        <InfoTile icon={<CheckCircle2 className="h-5 w-5" />} title="موجودی طلای دیجیتال" value={`${wallet?.goldBalanceGrams ?? 0} گرم`} />
        <InfoTile icon={<Clock className="h-5 w-5" />} title="آخرین شارژ" value="۳ روز پیش" />
      </div>

      <button className="btn btn-primary mt-6 w-full md:w-auto">
        شارژ کیف پول
      </button>
    </div>
  )
}

function ActivityPanel({ transactions }: { transactions: { type: string; amount: number; createdAt: string; description?: string | null }[] }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-xl font-bold">فعالیت‌های اخیر</h2>
          <p className="text-sm text-muted-foreground mt-1">تاریخچه کیف پول و تراکنش‌های مالی</p>
        </div>
        <Clock className="h-5 w-5 text-gold-600" />
      </div>

      <div className="space-y-3">
        {transactions.length ? transactions.slice(0, 8).map((transaction) => (
          <div key={transaction.createdAt + transaction.type + transaction.amount} className="rounded-2xl border border-border p-4 flex items-center justify-between gap-3">
            <div>
              <p className="font-bold text-navy-900">{transaction.type}</p>
              <p className="text-xs text-muted-foreground mt-1">{transaction.description || 'فعالیت کیف پول'}</p>
            </div>
            <div className="text-left">
              <p className="font-black text-navy-900">{transaction.amount} گرم</p>
              <p className="text-xs text-muted-foreground mt-1">{transaction.createdAt}</p>
            </div>
          </div>
        )) : (
          <EmptyState title="فعالیتی ثبت نشده" description="بعد از خرید، فروش یا شارژ کیف پول، فعالیت‌ها اینجا نمایش داده می‌شوند." />
        )}
      </div>
    </div>
  )
}

function FavoritesPanel() {
  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Heart className="h-6 w-6 text-gold-600" />
        <h2 className="text-xl font-bold">علاقه‌مندی‌ها</h2>
      </div>
      <EmptyState
        title="محصولی در علاقه‌مندی‌ها نیست"
        description="از صفحه فروشگاه می‌توانید محصولات را به لیست علاقه‌مندی‌ها اضافه کنید."
      />
    </div>
  )
}

function NotificationsPanel() {
  const notifications = [
    { title: 'سفارش GX-140201 ثبت شد', description: 'سفارش شما وارد مرحله پردازش شد.', time: '۱۰ دقیقه پیش' },
    { title: 'قیمت طلای ۱۸ عیار تغییر کرد', description: 'قیمت هر گرم ۰.۷۹٪ افزایش یافت.', time: '۱ ساعت پیش' },
    { title: 'کد تخفیف جدید فعال شد', description: 'برای خریدهای بالای ۲۰ میلیون تومان.', time: 'دیروز' },
  ]

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-4">
        <Bell className="h-6 w-6 text-gold-600" />
        <h2 className="text-xl font-bold">اعلان‌ها</h2>
      </div>
      <div className="space-y-3">
        {notifications.map((item, index) => (
          <div key={index} className="flex items-start justify-between gap-3 p-4 rounded-xl bg-gray-50">
            <div>
              <p className="font-bold text-sm">{item.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">{item.time}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SettingsPanel() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-4">تنظیمات حساب</h2>
      <div className="space-y-4">
        <ToggleRow title="اعلان سفارش‌ها" description="دریافت پیامک و نوتیفیکیشن برای تغییر وضعیت سفارش" enabled />
        <ToggleRow title="اعلان تغییر قیمت" description="آگاه‌سازی هنگام تغییر قیمت مظنه و طلای ۱۸ عیار" enabled />
        <ToggleRow title="ورود دو مرحله‌ای" description="افزایش امنیت حساب کاربری" />
        <ToggleRow title="حالت تاریک" description="نمایش پنل با تم تیره" />
      </div>
    </div>
  )
}

function InputField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input type="text" value={value} className="input" readOnly />
    </div>
  )
}

function InfoTile({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="p-5 rounded-2xl bg-gray-50 border border-border">
      <div className="text-gold-600 mb-3">{icon}</div>
      <p className="text-sm text-muted-foreground mb-1">{title}</p>
      <p className="text-2xl font-black text-navy-900">{value}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-gray-50">
      <Truck className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
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
