import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Gem, LockKeyhole, ShieldCheck, ShoppingBag, Sparkles, TrendingUp, WalletCards } from 'lucide-react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'

const benefits = [
  { icon: ShieldCheck, title: 'شفاف و قابل اعتماد', text: 'قیمت، وزن و عیار هر محصول را قبل از خرید شفاف ببینید.' },
  { icon: LockKeyhole, title: 'پرداخت امن', text: 'پرداخت آنلاین و کیف پول با ثبت دقیق تراکنش‌ها.' },
  { icon: TrendingUp, title: 'قیمت لحظه‌ای', text: 'تصمیم بهتر با قیمت به‌روز طلا و گزارش تغییرات.' },
]

const links = [
  { href: '/shop', title: 'فروشگاه طلا', text: 'محصول مناسب خود را پیدا کنید', icon: ShoppingBag },
  { href: '/pricing', title: 'قیمت لحظه‌ای', text: 'بازار را دقیق‌تر دنبال کنید', icon: TrendingUp },
  { href: '/wallet', title: 'کیف پول', text: 'دارایی و تراکنش‌ها را مدیریت کنید', icon: WalletCards },
]

export function LandingPage() {
  const { data: prices = [], isLoading } = useQuery({ queryKey: ['landing-gold-prices'], queryFn: api.getGoldPrices })
  const gold18 = prices.find((price) => price.type === 'gold18')

  return (
    <div className="min-h-screen overflow-hidden bg-[#faf9f6] text-stone-950">
      <header className="page-shell flex h-20 items-center justify-between">
        <Link to="/home" className="flex items-center gap-3" aria-label="گلدکسا، صفحه اصلی">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-amber-300"><Gem className="h-5 w-5" /></span>
          <span><strong className="block text-lg font-black">گلدکسا</strong><small className="block text-[10px] text-amber-700">ثروت، با اطمینان</small></span>
        </Link>
        <div className="flex items-center gap-2"><Link to="/pricing" className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-stone-600 hover:bg-amber-50 sm:block">قیمت‌ها</Link><Link to="/login" className="btn btn-primary px-4 py-2 text-sm">ورود امن</Link></div>
      </header>

      <main>
        <section className="page-shell grid gap-12 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:py-24">
          <div>
            <p className="eyebrow mb-5 flex items-center gap-2"><Sparkles className="h-4 w-4" />پلتفرم هوشمند طلا</p>
            <h1 className="max-w-3xl text-5xl font-black leading-[1.18] tracking-tight sm:text-7xl">خرید طلا، ساده‌تر و مطمئن‌تر از همیشه</h1>
            <p className="mt-6 max-w-2xl text-lg leading-9 text-stone-600">گلدکسا مسیر خرید و مدیریت طلا را از قیمت لحظه‌ای تا پرداخت امن و پیگیری سفارش، یکپارچه و شفاف می‌کند.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link to="/shop" className="btn btn-primary gap-2 px-7 py-4">شروع خرید <ArrowLeft className="h-5 w-5" /></Link><Link to="/pricing" className="btn btn-outline px-7 py-4">مشاهده قیمت‌ها</Link></div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm text-stone-600"><span className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-amber-700" />احراز هویت امن</span><span className="flex items-center gap-2"><LockKeyhole className="h-5 w-5 text-amber-700" />پرداخت رمزنگاری‌شده</span></div>
          </div>

          <div className="relative"><div className="absolute -inset-8 rounded-full bg-amber-200/40 blur-3xl" /><div className="relative overflow-hidden rounded-[2rem] bg-stone-950 p-6 text-white shadow-2xl sm:p-8">
            <div className="flex items-start justify-between"><div><p className="text-sm text-stone-400">طلای ۱۸ عیار</p><p className="mt-2 text-4xl font-black text-amber-300">{isLoading ? 'در حال دریافت…' : gold18 ? `${gold18.value.toLocaleString('fa-IR')} تومان` : 'قیمت موجود نیست'}</p></div><span className="rounded-2xl bg-amber-300/15 p-4 text-amber-300"><TrendingUp className="h-7 w-7" /></span></div>
            <div className="mt-12 h-32 overflow-hidden rounded-2xl bg-gradient-to-br from-amber-300/20 to-transparent p-4"><svg viewBox="0 0 420 120" className="h-full w-full" role="img" aria-label="نمودار روند قیمت طلا"><path d="M0 92 C40 72, 54 96, 90 70 S145 76, 178 45 S230 64, 265 34 S315 52, 350 22 S395 28, 420 8" fill="none" stroke="#f5d27a" strokeWidth="4" strokeLinecap="round" /></svg></div>
            <div className="mt-5 grid grid-cols-3 gap-3 text-center"><div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-stone-400">وضعیت</p><p className="mt-1 font-bold text-emerald-300">به‌روز</p></div><div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-stone-400">بازار</p><p className="mt-1 font-bold">فعال</p></div><div className="rounded-2xl bg-white/8 p-3"><p className="text-xs text-stone-400">اعتماد</p><p className="mt-1 font-bold">۱۰۰٪</p></div></div>
          </div></div>
        </section>

        <section className="page-shell grid gap-4 py-12 md:grid-cols-3">{benefits.map(({ icon: Icon, title, text }) => <article key={title} className="card p-6"><span className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-800"><Icon className="h-6 w-6" /></span><h2 className="text-lg font-black">{title}</h2><p className="mt-2 text-sm leading-7 text-stone-600">{text}</p></article>)}</section>

        <section className="page-shell py-12"><div className="mb-8 max-w-xl"><p className="eyebrow">یک تجربه یکپارچه</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">هر چیزی که برای تصمیم بهتر لازم دارید</h2></div><div className="grid gap-4 md:grid-cols-3">{links.map(({ href, title, text, icon: Icon }) => <Link key={href} to={href} className="group rounded-3xl border border-stone-200 bg-white p-6 transition hover:-translate-y-1 hover:border-amber-500 hover:shadow-xl"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-stone-950 text-amber-300"><Icon className="h-5 w-5" /></span><h3 className="mt-7 text-xl font-black">{title}</h3><p className="mt-2 text-sm text-stone-600">{text}</p><span className="mt-6 flex items-center gap-2 text-sm font-bold text-amber-800">مشاهده <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /></span></Link>)}</div></section>

        <section className="page-shell py-16"><div className="rounded-[2rem] bg-amber-200 p-8 text-center sm:p-14"><h2 className="text-3xl font-black sm:text-5xl">آماده‌اید با اطمینان شروع کنید؟</h2><p className="mx-auto mt-4 max-w-xl leading-8 text-stone-700">همین حالا محصولات را ببینید و تجربه‌ای شفاف برای خرید طلا داشته باشید.</p><Link to="/shop" className="btn btn-primary mt-7 px-7 py-4">ورود به فروشگاه</Link></div></section>
      </main>
      <footer className="border-t border-stone-200 py-8"><div className="page-shell flex flex-col gap-3 text-sm text-stone-500 sm:flex-row sm:items-center sm:justify-between"><span>© ۱۴۰۵ گلدکسا</span><span>خرید طلا، با اطمینان</span></div></footer>
    </div>
  )
}
