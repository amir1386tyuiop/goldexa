import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ShieldCheck, Star, TrendingUp } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { EscrowPayment, MarketplaceRating, OrderTrackingEvent, PaymentTransaction } from '@/types'
import { getStoredAuth } from '@/auth'

export function EscrowPage() {
  const [activeTab, setActiveTab] = useState<'escrow' | 'ratings' | 'payments' | 'tracking'>('escrow')
  const [orderId, setOrderId] = useState('')
  const auth = getStoredAuth()
  const queryClient = useQueryClient()

  const { data: escrows = [], isLoading: escrowsLoading, isError: escrowsError } = useQuery<EscrowPayment[]>({
    queryKey: ['escrow-payments'],
    queryFn: api.getEscrowPayments,
    initialData: [],
  })

  const { data: ratings = [], isLoading: ratingsLoading, isError: ratingsError } = useQuery<MarketplaceRating[]>({
    queryKey: ['marketplace-ratings', auth?.user.id],
    queryFn: () => api.getMarketplaceRatings(auth!.user.id),
    initialData: [],
    enabled: Boolean(auth),
  })

  const { data: payments = [], isLoading: paymentsLoading, isError: paymentsError } = useQuery<PaymentTransaction[]>({
    queryKey: ['payment-transactions'],
    queryFn: api.getPaymentTransactions,
    initialData: [],
  })

  const { data: tracking = [], isLoading: trackingLoading, isError: trackingError } = useQuery<OrderTrackingEvent[]>({
    queryKey: ['order-tracking', orderId],
    queryFn: () => (orderId ? api.getOrderTracking(orderId) : Promise.resolve([])),
    initialData: [],
    enabled: Boolean(orderId && auth),
  })

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
            {activeTab === 'escrow' && <AsyncState loading={escrowsLoading} error={escrowsError} label="پرداخت‌های امانی" content={<EscrowList payments={escrows} userId={auth?.user.id} onChanged={() => queryClient.invalidateQueries({ queryKey: ['escrow-payments'] })} />} />}
            {activeTab === 'ratings' && <AsyncState loading={ratingsLoading} error={ratingsError} label="امتیازها" content={<RatingList ratings={ratings} />} />}
            {activeTab === 'payments' && <AsyncState loading={paymentsLoading} error={paymentsError} label="تراکنش‌ها" content={<PaymentList payments={payments} />} />}
            {activeTab === 'tracking' && (
              <TrackingPanel
                orderId={orderId}
                onOrderIdChange={setOrderId}
                events={filteredTracking}
                loading={trackingLoading}
                error={trackingError}
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

function EscrowList({ payments, userId, onChanged }: { payments: EscrowPayment[]; userId?: string; onChanged: () => void }) {
  if (payments.length === 0) {
    return <EmptyState title="پرداخت امانی ثبت نشده" description="پرداخت‌های امن بازار دست دوم اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-gold-50 p-4 text-sm text-muted-foreground">پرداخت امانی پس از انتخاب آگهی معتبر در Marketplace یا پایان مزایده ایجاد می‌شود.</p>
      {payments.map((payment) => (
        <EscrowCard key={payment.id} payment={payment} userId={userId} onChanged={onChanged} />
      ))}
    </div>
  )
}

function EscrowCard({ payment, userId, onChanged }: { payment: EscrowPayment; userId?: string; onChanged: () => void }) {
  const [trackingCode, setTrackingCode] = useState('')
  const [disputeReason, setDisputeReason] = useState('')
  const payMutation = useMutation({ mutationFn: () => api.payEscrowFromWallet(payment.id), onSuccess: onChanged })
  const shipMutation = useMutation({ mutationFn: () => api.shipEscrowPayment(payment.id, trackingCode), onSuccess: onChanged })
  const deliveryMutation = useMutation({ mutationFn: () => api.confirmEscrowDelivery(payment.id), onSuccess: onChanged })
  const disputeMutation = useMutation({ mutationFn: () => api.openEscrowDispute(payment.id, disputeReason), onSuccess: () => { setDisputeReason(''); onChanged() } })
  const isBuyer = Boolean(userId && payment.buyerId === userId)
  const isSeller = Boolean(userId && payment.sellerId === userId)

  return <div className="card p-5">
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
          {isBuyer && payment.status === 'initiated' && <button type="button" className="btn btn-primary mt-4 w-full" disabled={payMutation.isPending} onClick={() => payMutation.mutate()}>{payMutation.isPending ? 'در حال پرداخت…' : 'پرداخت و قفل مبلغ از کیف پول'}</button>}
          {isSeller && payment.status === 'held' && <div className="mt-4 flex gap-2"><input className="input" aria-label="کد رهگیری ارسال" placeholder="کد رهگیری ارسال" value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} /><button type="button" className="btn btn-outline shrink-0" disabled={!trackingCode.trim() || shipMutation.isPending} onClick={() => shipMutation.mutate()}>ثبت ارسال</button></div>}
          {isBuyer && payment.status === 'held' && <button type="button" className="btn btn-primary mt-4 w-full" disabled={deliveryMutation.isPending} onClick={() => deliveryMutation.mutate()}>{deliveryMutation.isPending ? 'در حال تایید…' : 'تایید دریافت و آزادسازی مبلغ'}</button>}
          {(isBuyer || isSeller) && payment.status === 'held' && <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"><label className="text-xs font-bold text-red-900" htmlFor={`dispute-${payment.id}`}>ثبت اختلاف</label><textarea id={`dispute-${payment.id}`} className="input mt-2 min-h-20 bg-white" placeholder="دلیل اختلاف را توضیح دهید" value={disputeReason} onChange={(event) => setDisputeReason(event.target.value)} /><button type="button" className="btn mt-2 w-full border border-red-300 bg-white text-red-800" disabled={!disputeReason.trim() || disputeMutation.isPending} onClick={() => disputeMutation.mutate()}>{disputeMutation.isPending ? 'در حال ثبت…' : 'ثبت اختلاف و توقف تسویه'}</button></div>}
          {payment.status === 'disputed' && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-900">این معامله در حال بررسی اختلاف است: {payment.disputeReason || 'دلیل ثبت نشده'}</p>}
          {(payMutation.isError || shipMutation.isError || deliveryMutation.isError || disputeMutation.isError) && <p className="mt-3 text-sm text-red-700" role="alert">عملیات escrow انجام نشد؛ وضعیت و موجودی را بررسی کنید.</p>}
        </div>
}

function RatingList({ ratings }: { ratings: MarketplaceRating[] }) {
  if (ratings.length === 0) {
    return <EmptyState title="امتیازی ثبت نشده" description="بعد از معامله، خریدار و فروشنده می‌توانند به هم امتیاز بدهند." />
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-gold-50 p-4 text-sm text-muted-foreground">ثبت امتیاز فقط بعد از معامله‌ی معتبر و اتصال به سفارش یا آگهی انجام می‌شود.</p>
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

function PaymentList({ payments }: { payments: PaymentTransaction[] }) {
  if (payments.length === 0) {
    return <EmptyState title="تراکنشی ثبت نشده" description="تراکنش‌های پرداخت و درگاه بانکی اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="space-y-4">
      <p className="rounded-xl bg-gold-50 p-4 text-sm text-muted-foreground">تراکنش‌ها از checkout و درگاه پرداخت ثبت می‌شوند و در اینجا فقط نمایش داده می‌شوند.</p>
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
  loading,
  error,
}: {
  orderId: string
  onOrderIdChange: (value: string) => void
  events: OrderTrackingEvent[]
  loading: boolean
  error: boolean
}) {
  return (
    <div className="card p-6 space-y-4">
      <div className="flex gap-2">
        <input value={orderId} onChange={(event) => onOrderIdChange(event.target.value)} className="input" placeholder="شناسه سفارش" />
        <span className="text-xs text-muted-foreground self-center">رویدادها توسط سامانه ارسال ثبت می‌شوند.</span>
      </div>
      {loading ? <div role="status" className="py-8 text-center text-muted-foreground">در حال دریافت رهگیری...</div> : error ? <div role="alert" className="py-8 text-center text-red-700">دریافت رهگیری ناموفق بود.</div> : events.length === 0 ? (
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

function AsyncState({ loading, error, label, content }: { loading: boolean; error: boolean; label: string; content: ReactNode }) {
  if (loading) return <div role="status" className="card p-10 text-center text-muted-foreground">در حال دریافت {label}...</div>
  if (error) return <div role="alert" className="card border-red-200 bg-red-50 p-8 text-center text-red-800">دریافت {label} ناموفق بود. دوباره تلاش کنید.</div>
  return content
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
