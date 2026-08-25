import { useEffect, useState } from 'react'
import { Activity, Clock3, RefreshCw, ShieldCheck, TrendingDown, TrendingUp } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { GoldPrice } from '@/types'
import { formatPrice } from '@/utils/helpers'

const labels: Record<GoldPrice['type'], string> = { mizaneh: 'مظنه طلا', coin: 'سکه', ounce: 'انس جهانی', gold18: 'طلای ۱۸ عیار' }

export function PricingPage() {
  const { data: prices = [], isLoading, isError, dataUpdatedAt, refetch, isFetching } = useQuery({ queryKey: ['gold-prices'], queryFn: api.getGoldPrices, refetchInterval: 60000 })
  const [selected, setSelected] = useState<GoldPrice | null>(null)
  useEffect(() => { if (!selected && prices[0]) setSelected(prices[0]) }, [prices, selected])

  return <div className="page-shell py-28 pb-16">
    <div className="mb-10 flex flex-col gap-5 md:flex-row md:items-end md:justify-between"><div><p className="eyebrow flex items-center gap-2"><Activity className="h-4 w-4" />بازار لحظه‌ای</p><h1 className="mt-3 text-4xl font-black sm:text-5xl">قیمت‌های طلا</h1><p className="mt-3 max-w-2xl leading-8 text-stone-600">قیمت‌های معتبر برای تصمیم‌گیری، محاسبه محصول و مدیریت دارایی.</p></div><button disabled={isFetching} onClick={() => refetch()} className="btn btn-outline gap-2 self-start px-4 md:self-auto"><RefreshCw className={isFetching ? 'h-4 w-4 animate-spin' : 'h-4 w-4'} />به‌روزرسانی</button></div>
    {isError && <div role="alert" className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">دریافت قیمت‌ها با خطا روبه‌رو شد. دوباره تلاش کنید.</div>}
    {isLoading ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1,2,3,4].map((item) => <div key={item} className="h-40 animate-pulse rounded-3xl bg-stone-200" />)}</div> : prices.length === 0 ? <div className="card p-10 text-center text-stone-600">قیمت فعالی برای نمایش وجود ندارد.</div> : <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{prices.map((price) => { const up = price.change >= 0; return <button key={price.type} onClick={() => setSelected(price)} aria-pressed={selected?.type === price.type} className={`card cursor-pointer p-5 text-right transition hover:-translate-y-1 hover:shadow-lg ${selected?.type === price.type ? 'border-amber-700 ring-2 ring-amber-200' : ''}`}><div className="flex items-center justify-between"><span className="text-sm text-stone-600">{labels[price.type]}</span>{up ? <TrendingUp className="h-5 w-5 text-emerald-700" /> : <TrendingDown className="h-5 w-5 text-red-700" />}</div><strong className="mt-5 block text-2xl font-black">{formatPrice(price.value)} <small className="text-sm font-medium text-stone-500">تومان</small></strong><span className={`mt-2 block text-sm font-semibold ${up ? 'text-emerald-700' : 'text-red-700'}`}>{up ? '+' : ''}{formatPrice(price.change)} ({price.changePercent}٪)</span></button> })}</div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.8fr]"><section className="card p-6 sm:p-8"><div className="flex items-start justify-between"><div><p className="text-sm text-stone-500">نمای منتخب</p><h2 className="mt-2 text-2xl font-black">{selected ? labels[selected.type] : 'انتخاب نشده'}</h2></div><span className="rounded-2xl bg-amber-100 p-4 text-amber-800"><Clock3 className="h-6 w-6" /></span></div>{selected && <div className="mt-8 grid gap-4 sm:grid-cols-3"><div className="rounded-2xl bg-stone-950 p-5 text-white"><p className="text-sm text-stone-400">قیمت فعلی</p><strong className="mt-2 block text-xl text-amber-300">{formatPrice(selected.value)}</strong></div><div className="rounded-2xl bg-stone-100 p-5"><p className="text-sm text-stone-500">تغییر ریالی</p><strong className="mt-2 block text-xl">{formatPrice(selected.change)}</strong></div><div className="rounded-2xl bg-stone-100 p-5"><p className="text-sm text-stone-500">تغییر درصدی</p><strong className="mt-2 block text-xl">{selected.changePercent}٪</strong></div></div>}<p className="mt-6 flex items-center gap-2 text-xs text-stone-500"><span className="h-2 w-2 rounded-full bg-emerald-500" />آخرین بروزرسانی: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fa-IR') : 'در حال دریافت'}</p></section><aside className="rounded-3xl bg-amber-100 p-7"><ShieldCheck className="h-8 w-8 text-amber-800" /><h3 className="mt-5 text-xl font-black">قیمت قابل اتکا</h3><p className="mt-3 leading-8 text-stone-700">محاسبات سفارش و کیف پول باید با آخرین quote معتبر انجام شوند؛ قیمت نمایشی به‌تنهایی مبنای نهایی معامله نیست.</p></aside></div>
    </>}
  </div>
}
