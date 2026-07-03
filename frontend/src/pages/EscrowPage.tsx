import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { CheckCircle, ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { api, type CreateEscrowPaymentInput, type CreateMarketplaceRatingInput, type CreateOrderTrackingEventInput, type CreatePaymentTransactionInput } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { EscrowPayment, MarketplaceRating, OrderTrackingEvent, PaymentTransaction } from '@/types'

const defaultUserId = '11111111-1111-1111-1111-111111111111'

export function EscrowPage() {
  const [activeTab, setActiveTab] = useState<'escrow' | 'ratings' | 'payments' | 'tracking'>('escrow')
  const [orderId, setOrderId] = useState('')

  const { data: escrows = [] } = useQuery<EscrowPayment[]>({
    queryKey: ['escrow-payments'],
    queryFn: api.getEscrowPayments,
    initialData: [],
  })

  const { data: ratings = [] } = useQuery<MarketplaceRating[]>({
    queryKey: ['marketplace-ratings', defaultUserId],
    queryFn: () => api.getMarketplaceRatings(defaultUserId),
    initialData: [],
  })

  const { data: payments = [] } = useQuery<PaymentTransaction[]>({
    queryKey: ['payment-transactions'],
    queryFn: api.getPaymentTransactions,
    initialData: [],
  })

  const { data: tracking = [] } = useQuery<OrderTrackingEvent[]>({
    queryKey: ['order-tracking', orderId],
    queryFn: () => (orderId ? api.getOrderTracking(orderId) : Promise.resolve([])),
    initialData: [],
    enabled: Boolean(orderId),
  })

  const createEscrow = () => {
    const body: CreateEscrowPaymentInput = {
      buyerId: defaultUserId,
      sellerId: defaultUserId,
      amount: 35000000,
      fee: 1050000,
      trackingCode: `ESC-${Date.now()}`,
    }
    api.createEscrowPayment(body)
  }

  const createRating = () => {
    const body: CreateMarketplaceRatingInput = {
      reviewerId: defaultUserId,
      revieweeId: defaultUserId,
      rating: 5,
      body: 'تجربه خوب از معامله امن',
      category: 'seller',
    }
    api.createMarketplaceRating(body)
  }

  const createPayment = () => {
    const body: CreatePaymentTransactionInput = {
      userId: defaultUserId,
      amount: 35000000,
      paymentMethod: 'zarinpal',
      trackingCode: `PAY-${Date.now()}`,
    }
    api.createPaymentTransaction(body)
  }

  const createTracking = () => {
    if (!orderId) return
    const body: CreateOrderTrackingEventInput = {
      orderId,
      status: 'in_transit',
      location: 'مرکز توزیع',
      description: 'سفارش در مسیر تحویل است',
    }
    api.createOrderTrackingEvent(orderId, body)
  }

  const filteredTracking = useMemo(() => {
    if (!orderId) return tracking
    return tracking.filter((item) => item.orderId === orderId)
  }, [tracking, orderId])

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-navy-900">پرداخت امن، امتیازدهی و رهگیری</h1>
            <p className="text-muted-foreground mt-2">Escrow، پرداخت زрин‌پال، امتیازدهی بازار و رهگیری سفارش</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'escrow'} onClick={() => setActiveTab('escrow')}>امانی</TabButton>
            <TabButton active={activeTab === 'ratings'} onClick={() => setActiveTab('ratings')}>امتیازها</TabButton>
            <TabButton active={activeTab === 'payments'} onClick={() => setActiveTab('payments')}>پرداخت‌ها</TabButton>
            <TabButton active={activeTab === 'tracking'} onClick={() => setActiveTab('tracking')}>رهگیری</TabButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {activeTab === 'escrow' && <EscrowList payments={escrows} onCreate={createEscrow} />}
            {activeTab === 'ratings' && <RatingList ratings={ratings} onCreate={createRating} />}
            {activeTab === 'payments' && <PaymentList payments={payments} onCreate={createPayment} />}
            {activeTab === 'tracking' && (
              <TrackingPanel
                orderId={orderId}
                onOrderIdChange={setOrderId}
                events={filteredTracking}
                onCreate={createTracking}
              />
            )}
          </div>

          <aside className="space-y-6">
            <EscrowSummary escrows={escrows} payments={payments} ratings={ratings} />
            <EscrowRulesPanel />
          </aside>
        </div>
      </div>
    </div>
  )
}

function TabButton({ active, children, onClick }: { active: boolean; children: ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-xl px-4 py-2 text-sm font-bold transition-all ${
        active ? 'bg-navy-900 text-white' : 'bg-white text-muted-foreground hover:bg-gold-50'
      }`}
    >
      {children}
    </button>
  )
}

function EscrowList({ payments, onCreate }: { payments: EscrowPayment[]; onCreate: () => void }) {
  if (payments.length === 0) {
    return <EmptyState title="پرداخت امانی ثبت نشده" description="پرداخت‌های امن بازار دست دوم اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="space-y-4">
      <button onClick={onCreate} className="button-primary">
        <ShieldCheck className="h-4 w-4 ml-2" />
        ایجاد پرداخت امانی
      </button>
      {payments.map((payment) => (
        <div key={payment.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">پرداخت امن {payment.trackingCode}</h3>
              <p className="text-sm text-muted-foreground mt-1">مبلغ امانی تا تأیید نهایی نزد پلتفرم می‌ماند.</p>
            </div>
            <ShieldCheck className="h-5 w-5 text-gold-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="مبلغ" value={formatPrice(payment.amount)} />
            <InfoPill label="کارمزد" value={formatPrice(payment.fee)} />
            <InfoPill label="وضعیت" value={payment.status} />
            <InfoPill label="کد رهگیری" value={payment.trackingCode || 'ثبت نشده'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function RatingList({ ratings, onCreate }: { ratings: MarketplaceRating[]; onCreate: () => void }) {
  if (ratings.length === 0) {
    return <EmptyState title="امتیازی ثبت نشده" description="بعد از معامله، خریدار و فروشنده می‌توانند به هم امتیاز بدهند." />
  }

  return (
    <div className="space-y-4">
      <button onClick={onCreate} className="button-primary">
        <Star className="h-4 w-4 ml-2" />
        ثبت امتیاز
      </button>
      {ratings.map((rating) => (
        <div key={rating.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">امتیاز {rating.rating} از ۵</h3>
              <p className="text-sm text-muted-foreground mt-1">{rating.body || 'بدون توضیح'}</p>
            </div>
            <Star className="h-5 w-5 text-gold-600" />
          </div>
        </div>
      ))}
    </div>
  )
}

function PaymentList({ payments, onCreate }: { payments: PaymentTransaction[]; onCreate: () => void }) {
  if (payments.length === 0) {
    return <EmptyState title="تراکنشی ثبت نشده" description="تراکنش‌های پرداخت و درگاه بانکی اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="space-y-4">
      <button onClick={onCreate} className="button-primary">
        <TrendingUp className="h-4 w-4 ml-2" />
        ایجاد تراکنش
      </button>
      {payments.map((payment) => (
        <div key={payment.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">تراکنش {payment.trackingCode}</h3>
              <p className="text-sm text-muted-foreground mt-1">{payment.paymentMethod}</p>
            </div>
            <TrendingUp className="h-5 w-5 text-gold-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="مبلغ" value={formatPrice(payment.amount)} />
            <InfoPill label="وضعیت" value={payment.status} />
          </div>
        </div>
      ))}
    </div>
  )
}

function TrackingPanel({
  orderId,
  onOrderIdChange,
  events,
  onCreate,
}: {
  orderId: string
  onOrderIdChange: (value: string) => void
  events: OrderTrackingEvent[]
  onCreate: () => void
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex gap-2">
        <input value={orderId} onChange={(event) => onOrderIdChange(event.target.value)} className="input" placeholder="شناسه سفارش" />
        <button onClick={onCreate} className="button-primary">
          <CheckCircle className="h-4 w-4 ml-2" />
          افزودن رویداد
        </button>
      </div>
      {events.length === 0 ? (
        <EmptyState title="رویداد رهگیری یافت نشد" description="کد سفارش را وارد کنید تا رویدادهای رهگیری نمایش داده شوند." />
      ) : (
        events.map((event) => (
          <div key={event.id} className="rounded-xl bg-gold-50 p-4">
            <p className="font-bold text-navy-900">{event.status}</p>
            <p className="text-sm text-muted-foreground mt-1">{event.description || event.location || ''}</p>
          </div>
        ))
      )}
    </div>
  )
}

function EscrowSummary({
  escrows,
  payments,
  ratings,
}: {
  escrows: EscrowPayment[]
  payments: PaymentTransaction[]
  ratings: MarketplaceRating[]
}) {
  const heldAmount = escrows.filter((item) => item.status === 'held').reduce((sum, item) => sum + item.amount, 0)
  const avgRating = ratings.length
    ? ratings.reduce((sum, item) => sum + item.rating, 0) / ratings.length
    : 0

  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-navy-900">خلاصه اعتماد بازار</h2>
      <div className="mt-5 space-y-3">
        <InfoPill label="مبلغ امانی فعال" value={formatPrice(heldAmount)} />
        <InfoPill label="تراکنش‌ها" value={String(payments.length)} />
        <InfoPill label="میانگین امتیاز" value={avgRating ? avgRating.toFixed(1) : '۰'} />
      </div>
    </div>
  )
}

function EscrowRulesPanel() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-navy-900">قوانین Escrow</h2>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        <li>مبلغ خریدار تا تأیید دریافت کالا نزد پلتفرم نگهداری می‌شود.</li>
        <li>بعد از تحویل، مبلغ به فروشنده آزاد می‌شود.</li>
        <li>خریدار و فروشنده پس از تسویه به یکدیگر امتیاز می‌دهند.</li>
      </ul>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gold-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-navy-900 mt-1">{value}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="card p-8 text-center">
      <h3 className="font-black text-navy-900">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  )
}
