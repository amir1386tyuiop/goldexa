import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Package, Clock, CheckCircle2, AlertCircle } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice, getStatusText } from '@/utils/helpers'
import type { Order } from '@/types'
import { getStoredAuth } from '@/auth'

export function OrdersPage() {
  const userId = getStoredAuth()?.user.id || ''
  const { data: orders = [] } = useQuery({
    queryKey: ['orders', 'user', userId],
    queryFn: () => api.getOrdersByUser(userId),
    enabled: Boolean(userId),
  })

  const activeOrders = useMemo(() => orders.filter((order) => ['pending', 'paid', 'processing'].includes(order.status)), [orders])
  const completedOrders = useMemo(() => orders.filter((order) => ['delivered', 'paid'].includes(order.status)), [orders])

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <p className="text-sm text-gold-600 font-bold mb-2">چرخه سفارش</p>
          <h1 className="text-3xl font-black text-navy-900">سفارشات من</h1>
          <p className="text-muted-foreground mt-2">پیگیری سفارش از ثبت تا پرداخت، پردازش، ارسال و تکمیل.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <OrderStat title="سفارشات فعال" value={activeOrders.length} />
          <OrderStat title="سفارشات تکمیل‌شده" value={completedOrders.length} />
          <OrderStat title="مجموع خرید" value={formatPrice(orders.reduce((sum, order) => sum + order.totalAmount, 0))} suffix="تومان" />
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-6">
            <Package className="h-6 w-6 text-gold-600" />
            <h2 className="text-xl font-black text-navy-900">لیست سفارشات</h2>
          </div>

          <div className="space-y-4">
            {orders.length ? orders.map((order) => <OrderRow key={order.id} order={order} />) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">سفارشی ثبت نشده است</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OrderStat({ title, value, suffix }: { title: string; value: number | string; suffix?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-black text-navy-900 mt-2">
        {value} {suffix}
      </p>
    </div>
  )
}

function OrderRow({ order }: { order: Order }) {
  const icon = order.status === 'delivered' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <Clock className="h-5 w-5 text-gold-600" />

  return (
    <div className="rounded-2xl border border-border p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gold-50 flex items-center justify-center">{icon}</div>
          <div>
            <p className="font-black text-navy-900">{order.orderNumber || order.id}</p>
            <p className="text-sm text-muted-foreground mt-1">{getStatusText(order.status)} • {order.items.length} قلم کالا</p>
          </div>
        </div>
        <div className="text-left">
          <p className="font-black text-navy-900">{formatPrice(order.totalAmount)} تومان</p>
          <p className="text-xs text-muted-foreground mt-1">{order.createdAt}</p>
        </div>
      </div>

      <div className="mt-4 rounded-2xl bg-gray-50 p-4">
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <AlertCircle className="h-4 w-4 text-gold-600" />
          <span>وضعیت فعلی: {getStatusText(order.status)}</span>
        </div>
      </div>
    </div>
  )
}
