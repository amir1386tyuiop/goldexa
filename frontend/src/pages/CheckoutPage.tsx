import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, CheckCircle2, CreditCard, Loader2, MapPin, ShieldCheck, Truck, Wallet } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import { useStore } from '@/store/store'
import { getStoredAuth } from '@/auth'
import type { Address, Order } from '@/types'

const blankAddress: Address = { id: '', title: '', province: '', city: '', street: '', postalCode: '', isDefault: false }

export function CheckoutPage() {
  const navigate = useNavigate(); const auth = getStoredAuth(); const userId = auth?.user.id || ''
  const { cart, clearCart, getCartTotal, showToast } = useStore(); const [paymentMethod, setPaymentMethod] = useState<'online' | 'wallet'>('online'); const [address, setAddress] = useState<Address>(blankAddress); const [completedOrder, setCompletedOrder] = useState<Order | null>(null); const [validationError, setValidationError] = useState('')
  const addressesQuery = useQuery({ queryKey: ['addresses', userId], queryFn: () => api.getUserAddresses(userId), enabled: Boolean(userId) })
  useEffect(() => { const defaultAddress = addressesQuery.data?.find((item) => item.isDefault) || addressesQuery.data?.[0]; if (defaultAddress) setAddress({ id: defaultAddress.id, title: 'آدرس ارسال', province: defaultAddress.province, city: defaultAddress.city, street: defaultAddress.street, postalCode: defaultAddress.postalCode || '', isDefault: defaultAddress.isDefault }) }, [addressesQuery.data])
  const createOrder = useMutation({
    mutationFn: async (input: Parameters<typeof api.createOrder>[0]) => {
      const order = await api.createOrder(input)
      if (input.paymentMethod === 'online') {
        const payment = await api.requestOnlinePayment({
          userId,
          orderId: order.id,
          amount: Number(order.totalAmount),
          idempotencyKey: `order-${order.id}`,
          description: `پرداخت سفارش ${order.orderNumber || order.id}`,
        })
        return { order, payment }
      }
      return { order, payment: null }
    },
    onSuccess: ({ order, payment }) => {
      clearCart()
      if (payment?.paymentUrl && !payment.mock) {
        window.location.assign(payment.paymentUrl)
        return
      }
      setCompletedOrder(order)
    },
    onError: (error) => { showToast((error as { message?: string })?.message || 'ثبت سفارش ناموفق بود.', 'error') },
  })
  const total = getCartTotal(); const shippingCost = total > 50000000 ? 0 : 180000; const finalTotal = total + shippingCost; const hasExpiredItem = useMemo(() => cart.some((item) => new Date(item.reservedUntil).getTime() <= Date.now()), [cart])
  const updateAddress = (key: keyof Address, value: string) => setAddress((current) => ({ ...current, [key]: value }))
  async function submit() {
    if (!userId) { setValidationError('برای ثبت سفارش باید وارد حساب کاربری شوید.'); return }
    if (!cart.length || createOrder.isPending) return
    if (!address.province || !address.city || !address.street || address.postalCode.length < 5) { setValidationError('استان، شهر، آدرس کامل و کد پستی را تکمیل کنید.'); return }
    setValidationError('')
    try {
      const quotes = await Promise.all(cart.map((item) => api.createPricingQuote(item.product.category, item.product.weight)))
      createOrder.mutate({ userId, items: cart.map((item) => ({ productId: item.product.id, quantity: item.quantity })), shippingCost, address, paymentMethod, quoteIds: quotes.map((quote) => quote.quoteId) })
    } catch (error) {
      setValidationError((error as { message?: string })?.message || 'رزرو قیمت سفارش ناموفق بود؛ دوباره تلاش کنید.')
    }
  }

  if (!userId) return <State title="ورود لازم است" description="برای ادامه تسویه‌حساب ابتدا وارد حساب کاربری شوید." action={<button className="btn btn-primary" onClick={() => navigate('/login')}>ورود به حساب</button>} />
  if (completedOrder) return <main className="bg-stone-50 pb-16 pt-32"><div className="container mx-auto px-4"><div className="card mx-auto max-w-2xl p-8 text-center"><CheckCircle2 className="mx-auto h-16 w-16 text-emerald-700" aria-hidden="true" /><h1 className="mt-5 text-3xl font-black">سفارش با موفقیت ثبت شد</h1><p className="mt-3 text-stone-600">کد سفارش: <strong className="text-stone-950">#{completedOrder.orderNumber || completedOrder.id.slice(0, 8)}</strong></p><div className="mt-7 grid gap-3 text-right sm:grid-cols-2"><Info label="مبلغ پرداختی" value={`${formatPrice(completedOrder.totalAmount)} تومان`} /><Info label="روش پرداخت" value={completedOrder.paymentMethod === 'online' ? 'آنلاین' : 'کیف پول'} /></div><button className="btn btn-primary mt-7 w-full" onClick={() => navigate('/orders')}>مشاهده سفارش‌ها</button></div></div></main>
  if (!cart.length) return <State title="سبد خرید خالی است" description="برای ادامه خرید، ابتدا محصولی به سبد اضافه کنید." action={<button className="btn btn-primary" onClick={() => navigate('/shop')}>بازگشت به فروشگاه</button>} />

  return <main className="bg-stone-50 pb-16 pt-24"><div className="container mx-auto px-4"><header className="mb-7"><p className="text-sm font-semibold text-amber-700">خرید امن</p><h1 className="mt-2 text-3xl font-black tracking-tight">تسویه‌حساب</h1><p className="mt-2 text-sm text-stone-600">اطلاعات ارسال و روش پرداخت را با دقت بررسی کنید.</p></header>{hasExpiredItem && <div className="mb-5 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-7 text-amber-900" role="alert"><AlertTriangle className="mt-1 h-5 w-5 shrink-0" aria-hidden="true" />رزرو قیمت یکی از کالاها منقضی شده است؛ قیمت نهایی توسط سرور هنگام ثبت سفارش بررسی می‌شود.</div>}<div className="grid gap-6 lg:grid-cols-[1.45fr_0.85fr]"><div className="card p-5 sm:p-7"><SectionTitle icon={<MapPin />} title="آدرس ارسال" /><div className="grid gap-4 sm:grid-cols-2">{(['title','province','city','postalCode'] as const).map((key) => <Field key={key} id={`address-${key}`} label={{ title: 'عنوان آدرس', province: 'استان', city: 'شهر', postalCode: 'کد پستی' }[key]} value={address[key]} onChange={(value) => updateAddress(key, value)} required={key !== 'title'} />)}<div className="sm:col-span-2"><Field id="address-street" label="آدرس کامل" value={address.street} onChange={(value) => updateAddress('street', value)} required /></div></div><div className="mt-8"><SectionTitle icon={<CreditCard />} title="روش پرداخت" /><div className="grid gap-3 sm:grid-cols-2"><PaymentOption active={paymentMethod === 'online'} title="پرداخت آنلاین" description="اتصال امن به درگاه پرداخت" icon={<CreditCard />} onClick={() => setPaymentMethod('online')} /><PaymentOption active={paymentMethod === 'wallet'} title="کیف پول" description="پرداخت از موجودی حساب" icon={<Wallet />} onClick={() => setPaymentMethod('wallet')} /></div></div><div className="mt-8"><SectionTitle icon={<Truck />} title="ارسال بیمه‌شده" /><div className="rounded-2xl bg-stone-100 p-4 text-sm text-stone-700"><div className="flex justify-between gap-4"><span>هزینه ارسال</span><strong>{shippingCost ? `${formatPrice(shippingCost)} تومان` : 'رایگان'}</strong></div><p className="mt-2 text-xs text-stone-500">سفارش‌های بالای ۵۰ میلیون تومان شامل ارسال رایگان می‌شوند.</p></div></div></div><aside className="card h-fit p-5 sm:p-7"><h2 className="text-xl font-black">خلاصه سفارش</h2><div className="mt-5 space-y-4">{cart.map((item) => <div key={item.product.id} className="flex gap-3"><img src={item.product.images[0] || '/images/ring-1.svg'} alt={item.product.name} className="h-14 w-14 shrink-0 rounded-xl bg-amber-50 object-cover" /><div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm font-bold">{item.product.name}</p><p className="mt-1 text-xs text-stone-500">تعداد: {item.quantity}</p></div><p className="whitespace-nowrap text-sm font-bold">{formatPrice(item.product.finalPrice * item.quantity)}</p></div>)}</div><div className="mt-6 space-y-3 border-t border-stone-200 pt-5"><Summary label="مجموع کالاها" value={`${formatPrice(total)} تومان`} /><Summary label="ارسال" value={shippingCost ? `${formatPrice(shippingCost)} تومان` : 'رایگان'} /><div className="flex justify-between gap-4 border-t border-stone-200 pt-4"><span className="font-bold">مبلغ نهایی</span><strong className="text-lg text-amber-700">{formatPrice(finalTotal)} تومان</strong></div></div>{validationError && <p className="mt-5 rounded-xl bg-red-50 p-3 text-sm leading-6 text-red-800" role="alert">{validationError}</p>}{createOrder.isError && <p className="mt-3 text-sm text-red-700" role="alert">ثبت سفارش انجام نشد؛ دوباره تلاش کنید.</p>}<button className="btn btn-primary mt-5 flex min-h-12 w-full items-center justify-center gap-2" disabled={createOrder.isPending || addressesQuery.isLoading} onClick={submit}>{createOrder.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}{createOrder.isPending ? 'در حال ثبت سفارش…' : 'ثبت و پرداخت سفارش'}</button><button className="btn btn-outline mt-3 w-full" onClick={() => navigate(-1)}>بازگشت</button><p className="mt-5 flex gap-2 text-xs leading-6 text-stone-500"><ShieldCheck className="mt-1 h-4 w-4 shrink-0 text-amber-700" aria-hidden="true" />مبلغ نهایی و موجودی کیف پول در Backend اعتبارسنجی می‌شود.</p></aside></div></div></main>
}
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) { return <h2 className="mb-4 flex items-center gap-2 font-bold">{<span className="text-amber-700">{icon}</span>}{title}</h2> }
function Field({ id, label, value, onChange, required = false }: { id: string; label: string; value: string; onChange: (value: string) => void; required?: boolean }) { return <div><label htmlFor={id} className="mb-2 block text-sm font-semibold">{label}{required && <span className="mr-1 text-red-700" aria-hidden="true">*</span>}</label><input id={id} value={value} onChange={(e) => onChange(e.target.value)} className="input w-full" required={required} autoComplete={id.includes('postal') ? 'postal-code' : 'street-address'} /></div> }
function PaymentOption({ active, title, description, icon, onClick }: { active: boolean; title: string; description: string; icon: React.ReactNode; onClick: () => void }) { return <button type="button" aria-pressed={active} onClick={onClick} className={`min-h-24 rounded-2xl border p-4 text-right transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 ${active ? 'border-amber-600 bg-amber-50' : 'border-stone-200 hover:border-amber-300'}`}><span className={`block ${active ? 'text-amber-700' : 'text-stone-500'}`}>{icon}</span><span className="mt-2 block text-sm font-bold">{title}</span><span className="mt-1 block text-xs text-stone-600">{description}</span></button> }
function Summary({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-4 text-sm"><span className="text-stone-600">{label}</span><strong>{value}</strong></div> }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-2xl bg-stone-100 p-4"><p className="text-xs text-stone-500">{label}</p><p className="mt-1 font-bold">{value}</p></div> }
function State({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) { return <main className="bg-stone-50 pb-16 pt-32"><div className="container mx-auto px-4"><div className="card mx-auto flex max-w-xl flex-col items-center gap-4 p-8 text-center"><CheckCircle2 className="h-10 w-10 text-amber-700" aria-hidden="true" /><h1 className="text-2xl font-black">{title}</h1><p className="text-sm leading-7 text-stone-600">{description}</p>{action}</div></div></main> }
