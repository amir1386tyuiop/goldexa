import { Link } from 'react-router-dom'
import { ShieldCheck, TrendingUp } from 'lucide-react'

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-navy-950 text-white">
      <div className="container mx-auto grid gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 text-xl font-black">
              ◆
            </div>
            <div>
              <p className="text-xl font-black">گلدکسا</p>
              <p className="text-sm text-white/60">پلتفرم جامع خرید و مدیریت طلا</p>
            </div>
          </div>
          <p className="max-w-md leading-8 text-white/70">
            قیمت شفاف، پرداخت امن، کیف پول دیجیتال، مزایده و طراحی اختصاصی — همه در یک پلتفرم.
          </p>
        </div>

        <div>
          <p className="mb-4 font-black text-gold-300">دسترسی سریع</p>
          <div className="flex flex-col gap-2 text-sm text-white/70">
            <Link to="/home" className="hover:text-gold-300">فروشگاه</Link>
            <Link to="/pricing" className="hover:text-gold-300">قیمت لحظه‌ای</Link>
            <Link to="/wallet" className="hover:text-gold-300">کیف پول</Link>
            <Link to="/auctions" className="hover:text-gold-300">مزایده</Link>
          </div>
        </div>

        <div>
          <p className="mb-4 font-black text-gold-300">اعتماد و امنیت</p>
          <div className="space-y-3 text-sm text-white/70">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-400" /> پرداخت زرین‌پال</p>
            <p className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-gold-400" /> قیمت‌گذاری لحظه‌ای</p>
          </div>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-sm text-white/50">
        © ۱۴۰۵ گلدکسا — تمامی حقوق محفوظ است
      </div>
    </footer>
  )
}
