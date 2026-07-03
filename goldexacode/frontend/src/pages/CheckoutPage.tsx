import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { CreditCard, CheckCircle2, MapPin, Truck, Wallet } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import { useStore } from '@/store/store'
import type { Order } from '@/types'

const defaultUserId = '11111111-1111-1111-1111-111111111111'

export function CheckoutPage() {
  const navigate = useNavigate()
  const { cart, clearCart, getCartTotal, showToast } = useStore()
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'wallet'>('online')
  const [address, setAddress] = useState({
    title: 'خانه',
    province: 'اصفهان',
    city: 'اصفهان',
    street: 'خیابان چهارباغ، پلاک ۱۲',
    postalCode: '81467',
    isDefault: true,
  })
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)

  const createOrder = useMutation({
    mutationFn: api.createOrder,
    onSuccess: (order) => {
      setCompletedOrder(order)
      clearCart()
    },
    onError: () => {
      showToast('ثبت سفارش با خطا مواجه شد. لطفاً دوباره تلاش کنید.', 'error')
    },
  })

  const total = getCartTotal()
  const shippingCost = total > 50000000 ? 0 : 180000
  const finalTotal = total + shippingCost

  const handleSubmit = () => {
    if (cart.length === 0 || createOrder.isPending) return

    createOrder.mutate({
      userId: defaultUserId,
      items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })),
      shippingCost,
      address,
      paymentMethod,
    })
  }

  if (cart.length === 0 && !completedOrder) {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="card p-8 text-center">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-gold-600" />
            <h1 className="text-2xl font-black mb-2">سبد خرید خالی است</h1>
            <p className="text-muted-foreground mb-6">برای ادامه خرید، ابتدا محصولی به سبد اضافه کنید.</p>
            <button onClick={() => navigate('/shop')} className="btn btn-primary">
              بازگشت به فروشگاه
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (completedOrder) {
    return (
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto card p-8 text-center">
            <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-green-600" />
            <h1 className="text-3xl font-black mb-3">سفارش با موفقیت ثبت شد</h1>
            <p className="text-muted-foreground mb-6">
              کد رهگیری سفارش شما: <span className="font-bold text-navy-900">#{completedOrder.orderNumber || completedOrder.id.slice(0, 8)}</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right mb-6">
              <InfoBox label="مبلغ پرداختی" value={`${formatPrice(completedOrder.totalAmount)} تومان`} />
              <InfoBox label="روش پرداخت" value={completedOrder.paymentMethod === 'online' ? 'آنلاین' : 'کیف پول'} />
            </div>
            <button onClick={() => navigate('/dashboard')} className="btn btn-primary w-full">
              مشاهده در پنل کاربری
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-6">
              <h1 className="text-2xl font-black mb-6">تسویه حساب</h1>

              <div className="space-y-5">
                <section>
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-gold-600" />
                    آدرس ارسال
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InputField label="عنوان آدرس" value={address.title} onChange={(value) => setAddress({ ...address, title: value })} />
                    <InputField label="استان" value={address.province} onChange={(value) => setAddress({ ...address, province: value })} />
                    <InputField label="شهر" value={address.city} onChange={(value) => setAddress({ ...address, city: value })} />
                    <InputField label="کد پستی" value={address.postalCode} onChange={(value) => setAddress({ ...address, postalCode: value })} />
                    <div className="md:col-span-2">
                      <InputField label="آدرس کامل" value={address.street} onChange={(value) => setAddress({ ...address, street: value })} />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-gold-600" />
                    روش پرداخت
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PaymentOption
                      active={paymentMethod === 'online'}
                      title="پرداخت آنلاین"
                      description="اتصال امن به درگاه پرداخت"
                      icon={<CreditCard className="h-5 w-5" />}
                      onClick={() => setPaymentMethod('online')}
                    />
                    <PaymentOption
                      active={paymentMethod === 'wallet'}
                      title="کیف پول"
                      description="استفاده از موجودی حساب کاربری"
                      icon={<Wallet className="h-5 w-5" />}
                      onClick={() => setPaymentMethod('wallet')}
                    />
                  </div>
                </section>

                <section>
                  <h2 className="font-bold mb-3 flex items-center gap-2">
                    <Truck className="h-5 w-5 text-gold-600" />
                    ارسال
                  </h2>
                  <div className="p-4 rounded-xl bg-gray-50 border border-border">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">هزینه ارسال بیمه‌شده</span>
                      <span className="font-bold">{shippingCost === 0 ? 'رایگان' : `${formatPrice(shippingCost)} تومان`}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      سفارش‌های بالای ۵۰ میلیون تومان شامل ارسال رایگان می‌شوند.
                    </p>
                  </div>
                </section>
              </div>
            </div>
          </div>

          <aside className="card p-6 h-fit">
            <h2 className="text-xl font-bold mb-4">خلاصه سفارش</h2>
            <div className="space-y-3 mb-6">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-3">
                  <img
                    src={item.product.images[0] || '/images/ring-1.svg'}
                    alt={item.product.name}
                    className="h-16 w-16 rounded-xl bg-gold-50 object-cover flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm line-clamp-2">{item.product.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">تعداد: {item.quantity}</p>
                    <p className="text-xs text-gold-700 mt-1">
                      رزرو قیمت تا {new Date(item.reservedUntil).toLocaleTimeString('fa-IR')}
                    </p>
                  </div>
                  <p className="text-sm font-bold whitespace-nowrap">{formatPrice(item.product.finalPrice * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-2 border-t border-border pt-4 mb-6">
              <SummaryRow label="مجموع کالاها" value={`${formatPrice(total)} تومان`} />
              <SummaryRow label="هزینه ارسال" value={shippingCost === 0 ? 'رایگان' : `${formatPrice(shippingCost)} تومان`} />
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="font-bold">مبلغ قابل پرداخت</span>
                <span className="text-xl font-black text-gold-600">{formatPrice(finalTotal)} تومان</span>
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={cart.length === 0 || createOrder.isPending}
              className="btn btn-primary w-full mb-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createOrder.isPending ? 'در حال ثبت سفارش...' : 'ثبت و پرداخت سفارش'}
            </button>
            <button onClick={() => navigate(-1)} className="btn btn-outline w-full">
              بازگشت
            </button>
          </aside>
        </div>
      </div>
    </div>
  )
}

function InputField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
      <input value={value} onChange={(event) => onChange(event.target.value)} className="input" />
    </div>
  )
}

function PaymentOption({
  active,
  title,
  description,
  icon,
  onClick,
}: {
  active: boolean
  title: string
  description: string
  icon: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`text-right p-4 rounded-xl border transition-all ${
        active ? 'border-gold-500 bg-gold-50' : 'border-border hover:bg-gray-50'
      }`}
    >
      <div className={`mb-3 ${active ? 'text-gold-600' : 'text-muted-foreground'}`}>{icon}</div>
      <p className="font-bold text-sm mb-1">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </button>
  )
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4 rounded-xl bg-gray-50 border border-border text-right">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold">{value}</p>
    </div>
  )
}
