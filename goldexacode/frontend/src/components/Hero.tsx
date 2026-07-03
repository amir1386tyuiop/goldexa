import { ShoppingCart, Sparkles, Clock, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'

const features = [
  {
    icon: <Clock className="h-6 w-6" />,
    title: 'قیمت لحظه‌ای',
    description: 'به‌روزرسانی قیمت طلا هر ۶۰ ثانیه با نمایش شفاف اجزای قیمت',
  },
  {
    icon: <Sparkles className="h-6 w-6" />,
    title: 'پرو مجازی',
    description: 'امکان پرو کردن طلا با واقعیت افزوده قبل از خرید',
  },
  {
    icon: <Shield className="h-6 w-6" />,
    title: 'خرید امن',
    description: 'پرداخت امن با درگاه بانکی و تضمین اصالت کالا',
  },
  {
    icon: <ShoppingCart className="h-6 w-6" />,
    title: 'سبدخرید هوشمند',
    description: 'رزرو قیمت به مدت ۵ دقیقه برای جلوگیری از نوسانات',
  },
]

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-sarquee to-navy-800 text-white pt-20 pb-16">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(212,168,67,0.15),transparent_30%)]" />
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 text-sm mb-6">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            قیمت لحظه‌ای فعال است
          </div>
          <h1 className="text-4xl md:text-6xl font-black leading-tight mb-6">
            طلای شما، <span className="text-gold-300">تجربه‌ای متفاوت</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
            از خرید آنلاین با قیمت لحظه‌ای تا پرو مجازی با واقعیت افزوده —
            گلدکسا، مرجع اول طلا در منطقه
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/shop"
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-gold-400 to-gold-600 text-white font-bold hover:shadow-lg hover:shadow-gold-500/20 transition-all"
            >
              🛍️ مشاهده محصولات
            </Link>
            <Link
              to="/ar"
              className="px-8 py-3 rounded-xl border border-white/30 text-white font-bold hover:bg-white/10 transition-all"
            >
              📷 پرو مجازی
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-16">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm"
            >
              <div className="text-gold-300 mb-3">{feature.icon}</div>
              <h3 className="font-bold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-300 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
