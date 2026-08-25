import { ArrowUpLeft, Gem, ShieldCheck, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer className="mt-auto bg-stone-950 text-white">
      <div className="page-shell grid gap-10 py-14 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-stone-950"><Gem className="h-6 w-6" /></span>
            <div><p className="text-xl font-black">گلدکسا</p><p className="text-sm text-white/60">ثروت، با اطمینان</p></div>
          </div>
          <p className="max-w-md leading-8 text-white/65">قیمت شفاف، پرداخت امن و تجربه‌ای ساده برای خرید و مدیریت طلای شما.</p>
        </div>
        <div>
          <p className="mb-4 font-black text-amber-300">دسترسی سریع</p>
          <div className="flex flex-col gap-3 text-sm text-white/70">
            <Link to="/home" className="flex items-center justify-between hover:text-amber-300">فروشگاه <ArrowUpLeft className="h-4 w-4" /></Link>
            <Link to="/pricing" className="flex items-center justify-between hover:text-amber-300">قیمت لحظه‌ای <ArrowUpLeft className="h-4 w-4" /></Link>
            <Link to="/wallet" className="flex items-center justify-between hover:text-amber-300">کیف پول <ArrowUpLeft className="h-4 w-4" /></Link>
            <Link to="/auctions" className="flex items-center justify-between hover:text-amber-300">مزایده <ArrowUpLeft className="h-4 w-4" /></Link>
          </div>
        </div>
        <div>
          <p className="mb-4 font-black text-amber-300">اعتماد و امنیت</p>
          <div className="space-y-3 text-sm text-white/70"><p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-amber-300" />پرداخت امن</p><p className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-amber-300" />قیمت‌گذاری لحظه‌ای</p></div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-sm text-white/50">© ۱۴۰۵ گلدکسا — تمامی حقوق محفوظ است</div>
    </footer>
  )
}
