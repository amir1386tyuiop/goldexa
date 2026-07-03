import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  Blocks,
  CreditCard,
  Gem,
  Gavel,
  Home,
  LayoutGrid,
  Lock,
  MapPin,
  PackageCheck,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { api } from '@/api/client'

const modules = [
  { icon: <Home className="h-7 w-7" />, title: 'صفحه اصلی', description: 'نمای مدرن و سریع از امکانات اصلی گلدکسا برای شروع تجربه خرید طلا.', href: '/' },
  { icon: <LayoutGrid className="h-7 w-7" />, title: 'داشبورد', description: 'مدیریت سفارش‌ها، کیف پول، پروفایل و دسترسی‌های کاربری در یک نمای اختصاصی.', href: '/dashboard' },
  { icon: <TrendingUp className="h-7 w-7" />, title: 'قیمت لحظه‌ای', description: 'مشاهده مظنه، سکه، انس جهانی و طلای ۱۸ عیار با تغییرات لحظه‌ای.', href: '/pricing' },
  { icon: <PackageCheck className="h-7 w-7" />, title: 'سفارشات', description: 'پیگیری وضعیت پرداخت، پردازش، ارسال، تحویل و تکمیل سفارش.', href: '/orders' },
  { icon: <Wallet className="h-7 w-7" />, title: 'کیف پول', description: 'موجودی ریالی، طلای دیجیتال، خرید و فروش گرم و تاریخچه تراکنش‌ها.', href: '/wallet' },
  { icon: <ShoppingBag className="h-7 w-7" />, title: 'فروشگاه', description: 'کاتالوگ محصولات، وزن و عیار شفاف، محاسبه قیمت، سبد خرید و پرداخت.', href: '/shop' },
  { icon: <Gavel className="h-7 w-7" />, title: 'مزایده', description: 'ثبت پیشنهاد، مشاهده برنده، پرداخت و تسویه امن مزایده‌های طلا.', href: '/auctions' },
  { icon: <Sparkles className="h-7 w-7" />, title: 'طراحی اختصاصی', description: 'ساخت زیورآلات سفارشی با برآورد وزن، عیار، نگین، اجرت و قیمت نهایی.', href: '/builder' },
  { icon: <ShieldCheck className="h-7 w-7" />, title: 'پرداخت امن', description: 'امانت‌گذاری، تأیید پرداخت، تسویه امن و مدیریت اختلاف برای معاملات حساس.', href: '/escrow' },
  { icon: <Blocks className="h-7 w-7" />, title: 'پرو مجازی', description: 'نمایش سه‌بعدی و تجربه مجازی محصولات و طراحی‌ها قبل از خرید.', href: '/ar' },
  { icon: <Gem className="h-7 w-7" />, title: 'بازار دست دوم', description: 'خرید و فروش طلای دست دوم با تأیید کارشناسی، پرداخت امن و پیگیری وضعیت.', href: '/marketplace' },
]

const featureStrips = [
  { icon: <Lock />, title: 'ورود امن با نقش', description: 'احراز هویت OTP برای buyer، seller، designer، admin و نقش‌های تخصصی.' },
  { icon: <MapPin />, title: 'آدرس و ارسال', description: 'مدیریت آدرس، کد رهگیری، وضعیت ارسال و تحویل سفارش.' },
  { icon: <CreditCard />, title: 'پرداخت و کیف پول', description: 'پرداخت آنلاین، کیف پول ریالی و طلای دیجیتال با تراکنش‌های شفاف.' },
  { icon: <LayoutGrid />, title: 'کاتالوگ کامل', description: 'محصول، دسته‌بندی، نگین، موجودی، قیمت و محاسبه خودکار.' },
]

const quickLinks = [
  { title: 'شروع خرید', href: '/shop', description: 'مشاهده محصولات و ثبت سفارش' },
  { title: 'قیمت لحظه‌ای', href: '/pricing', description: 'قیمت‌های زنده طلا و سکه' },
  { title: 'مزایده‌ها', href: '/auctions', description: 'ثبت پیشنهاد و پیگیری برنده' },
  { title: 'طراحی اختصاصی', href: '/builder', description: 'ساخت سفارش سفارشی' },
]

export function LandingPage() {
  const { data: goldPrices = [] } = useQuery({
    queryKey: ['landing-gold-prices'],
    queryFn: api.getGoldPrices,
    initialData: [],
  })

  const gold18 = goldPrices.find((price) => price.type === 'gold18')?.value || 3_560_000
  const mizaneh = goldPrices.find((price) => price.type === 'mizaneh')?.value || 142_500_000
  const coin = goldPrices.find((price) => price.type === 'coin')?.value || 41_500_000
  const ounce = goldPrices.find((price) => price.type === 'ounce')?.value || 2_036

  return (
    <div className="min-h-screen overflow-hidden bg-background text-navy-900">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-16rem] top-[-12rem] h-[34rem] w-[34rem] rounded-full bg-gold-300/30 blur-3xl" />
        <div className="absolute right-[-18rem] top-[8rem] h-[38rem] w-[38rem] rounded-full bg-navy-900/10 blur-3xl" />
        <div className="absolute bottom-[-18rem] left-[18rem] h-[34rem] w-[34rem] rounded-full bg-gold-500/20 blur-3xl" />
      </div>

      <header className="container mx-auto flex items-center justify-between px-4 py-5">
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-white text-2xl font-black shadow-gold transition group-hover:scale-105">
            ◆
          </div>
          <div>
            <h1 className="text-xl font-black text-navy-900">گلدکسا</h1>
            <p className="text-xs text-gold-600">پلتفرم جامع طلا</p>
          </div>
        </Link>
        <div className="flex items-center gap-3">
          <Link to="/shop" className="hidden sm:inline-flex items-center rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-bold text-navy-900 shadow-sm transition hover:-translate-y-0.5 hover:bg-gold-50">
            مشاهده فروشگاه
          </Link>
          <Link to="/login" className="inline-flex items-center rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-navy-800">
            ورود امن
          </Link>
        </div>
      </header>

      <main>
        <section className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-2 lg:items-center lg:py-20">
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-gold-500/25 bg-white/80 px-4 py-2 text-sm font-black text-gold-700 shadow-sm backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              بازار طلا با قیمت شفاف، پرداخت امن و تجربه کاملاً آنلاین
            </div>

            <h2 className="text-5xl font-black leading-[1.18] tracking-tight text-navy-900 sm:text-7xl">
              طلای هوشمند، از قیمت لحظه‌ای تا پرداخت امن
            </h2>

            <p className="max-w-2xl text-lg leading-9 text-muted-foreground">
              گلدکسا همه مسیر خرید طلا را یکجا ساخته است: فروشگاه، مزایده، بازار دست دوم، طراحی اختصاصی، کیف پول دیجیتال، سفارش، پرو مجازی و پرداخت امن.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link to="/shop" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-gold-500 px-7 py-4 font-black text-white shadow-gold transition hover:-translate-y-1 hover:bg-gold-600">
                شروع خرید از فروشگاه
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <Link to="/pricing" className="inline-flex items-center justify-center rounded-2xl border border-border bg-white px-7 py-4 font-black text-navy-900 shadow-sm transition hover:-translate-y-1 hover:bg-gold-50">
                مشاهده قیمت لحظه‌ای
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatPill label="طلای ۱۸ عیار" value={`${formatCompact(gold18)} تومان`} />
              <StatPill label="مظنه" value={`${formatCompact(mizaneh)} تومان`} />
              <StatPill label="سکه" value={`${formatCompact(coin)} تومان`} />
              <StatPill label="انس جهانی" value={`${ounce.toLocaleString('fa-IR')}`} />
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-gold-300/45 via-gold-500/15 to-navy-900/10 blur-3xl" />
            <div className="relative rounded-[3rem] border border-gold-500/20 bg-white/85 p-5 shadow-2xl backdrop-blur-xl">
              <div className="rounded-[2rem] bg-navy-900 p-6 text-white">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-gold-200">طلای ۱۸ عیار</p>
                    <p className="text-3xl font-black">{formatCompact(gold18)} تومان</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-500/20 text-gold-300">
                    <TrendingUp className="h-8 w-8" />
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <Metric label="مظنه" value={formatCompact(mizaneh)} />
                  <Metric label="سکه" value={formatCompact(coin)} />
                  <Metric label="انس" value={ounce.toLocaleString('fa-IR')} />
                </div>

                <div className="mt-6 rounded-3xl bg-white/10 p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/70">کیف پول دیجیتال</p>
                      <p className="text-xl font-black">۵٬۰۰۰٬۰۰۰ تومان</p>
                    </div>
                    <Wallet className="h-9 w-9 text-gold-300" />
                  </div>
                  <div className="mt-5 h-2 rounded-full bg-white/10">
                    <div className="h-2 w-3/5 rounded-full bg-gradient-to-r from-gold-300 to-gold-500" />
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <MiniCard icon={<PackageCheck />} title="سفارش" description="پرداخت تا تحویل" />
                <MiniCard icon={<Sparkles />} title="طراحی" description="ساخت سفارشی" />
                <MiniCard icon={<Gavel />} title="مزایده" description="ثبت پیشنهاد" />
                <MiniCard icon={<ShieldCheck />} title="امنیت" description="پرداخت امن" />
              </div>
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-10">
          <div className="rounded-[2rem] border border-border bg-white/90 p-6 shadow-sm backdrop-blur">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
              {featureStrips.map((item) => (
                <FeatureStrip key={item.title} {...item} />
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="mb-8 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <p className="text-sm font-black text-gold-600">نوار دسترسی سریع</p>
              <h2 className="text-4xl font-black text-navy-900">همه ماژول‌های اصلی گلدکسا</h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              هوش مصنوعی از نوار عمومی حذف شده و فقط از داخل داشبورد ادمین قابل دسترسی است.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {modules.map((module) => (
              <Link key={module.title} to={module.href} className="group rounded-[1.5rem] border border-border bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:border-gold-300 hover:shadow-xl">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-50 text-gold-600 transition group-hover:bg-gold-500 group-hover:text-white">
                  {module.icon}
                </div>
                <h3 className="text-xl font-black text-navy-900">{module.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{module.description}</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="container mx-auto grid gap-6 px-4 py-12 lg:grid-cols-3">
          {quickLinks.map((link) => (
            <Link key={link.title} to={link.href} className="rounded-[2rem] border border-gold-500/20 bg-gradient-to-br from-white to-gold-50 p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
              <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-navy-900 text-white">
                <ArrowLeft className="h-6 w-6 rotate-45" />
              </div>
              <h3 className="text-2xl font-black text-navy-900">{link.title}</h3>
              <p className="mt-3 leading-7 text-muted-foreground">{link.description}</p>
            </Link>
          ))}
        </section>

        <section className="container mx-auto grid gap-6 px-4 py-12 lg:grid-cols-2">
          <div className="rounded-[2rem] bg-navy-900 p-8 text-white shadow-2xl">
            <ShieldCheck className="mb-6 h-10 w-10 text-gold-300" />
            <h2 className="text-3xl font-black">پرداخت امن و سفارش قابل پیگیری</h2>
            <p className="mt-4 leading-8 text-white/70">
              از سبد خرید تا پرداخت، تسویه، ارسال و تحویل؛ هر مرحله در سفارشات و کیف پول ثبت و قابل پیگیری است.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <AiBadge title="پرداخت آنلاین" value="Escrow" />
              <AiBadge title="پیگیری سفارش" value="Tracking" />
              <AiBadge title="کیف پول" value="Wallet" />
              <AiBadge title="کد رهگیری" value="Shipment" />
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-white p-8 shadow-sm">
            <Gavel className="mb-6 h-10 w-10 text-gold-600" />
            <h2 className="text-3xl font-black text-navy-900">مزایده و بازار دست دوم</h2>
            <p className="mt-4 leading-8 text-muted-foreground">
              مزایده‌های فعال، ثبت پیشنهاد، آگهی طلای دست دوم، تأیید کارشناسی و پرداخت امن در یک مسیر ساده.
            </p>
            <div className="mt-8 grid grid-cols-2 gap-3">
              <AiBadge title="ثبت پیشنهاد" value="Bid" />
              <AiBadge title="آگهی دست دوم" value="Used Gold" />
              <AiBadge title="کارشناسی" value="Review" />
              <AiBadge title="تسویه امن" value="Settlement" />
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-14">
          <div className="rounded-[2.5rem] bg-gold-500 p-8 text-center text-white shadow-gold sm:p-12">
            <h2 className="text-4xl font-black sm:text-6xl">آماده تجربه طلای هوشمند هستید؟</h2>
            <p className="mx-auto mt-4 max-w-2xl text-white/80">
              از قیمت لحظه‌ای تا طراحی سفارشی، کیف پول دیجیتال، مزایده، بازار دست دوم، پرو مجازی و پرداخت امن؛ گلدکسا همه چیز را یکجا ساخته است.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Link to="/shop" className="rounded-2xl bg-white px-8 py-4 font-black text-navy-900 transition hover:-translate-y-1">ورود به فروشگاه</Link>
              <Link to="/login" className="rounded-2xl border border-white/40 px-8 py-4 font-black text-white transition hover:-translate-y-1 hover:bg-white/10">ورود یا ثبت‌نام</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border bg-white">
        <div className="container mx-auto flex flex-col gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© ۱۴۰۵ گلدکسا. پلتفرم جامع طلا.</p>
          <div className="flex flex-wrap gap-4">
            <Link to="/pricing" className="hover:text-gold-700">قیمت‌ها</Link>
            <Link to="/wallet" className="hover:text-gold-700">کیف پول</Link>
            <Link to="/orders" className="hover:text-gold-700">سفارشات</Link>
            <Link to="/login" className="hover:text-gold-700">ورود</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <p className="text-2xl font-black text-navy-900">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white/10 p-3">
      <p className="text-xs text-white/60">{label}</p>
      <p className="mt-1 font-black">{value}</p>
    </div>
  )
}

function MiniCard({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-4 text-navy-900 shadow-sm">
      <div className="text-gold-600">{icon}</div>
      <p className="mt-3 font-black">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}

function FeatureStrip({ icon, title, description }: { icon: ReactNode; title: string; description: string }) {
  return (
    <div className="flex gap-4 rounded-3xl bg-gray-50 p-5">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gold-50 text-gold-600">{icon}</div>
      <div>
        <p className="font-black text-navy-900">{title}</p>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

function AiBadge({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-2xl border border-gold-500/20 bg-white p-4">
      <p className="text-sm font-bold text-gold-700">{value}</p>
      <p className="mt-2 font-black text-navy-900">{title}</p>
    </div>
  )
}

function formatCompact(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}م`
  return value.toLocaleString('fa-IR')
}
