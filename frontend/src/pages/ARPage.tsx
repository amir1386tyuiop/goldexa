import { Camera, Sparkles, Smartphone } from 'lucide-react'

const arSteps = [
  {
    icon: <Camera className="h-8 w-8" />,
    title: 'دسترسی به دوربین',
    description: 'سیستم اجازه دسترسی به دوربین موبایل را درخواست می‌کند',
  },
  {
    icon: <Smartphone className="h-8 w-8" />,
    title: 'تشخیص عضو بدن',
    description: 'دست، گردن یا صورت شما به صورت خودکار تشخیص داده می‌شود',
  },
  {
    icon: <Sparkles className="h-8 w-8" />,
    title: 'پرو مجازی',
    description: 'مدل سه‌بعدی طلا روی بدن شما نمایش داده می‌شود',
  },
]

export function ARPage() {
  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-navy-900 mb-4">
            📷 پرو مجازی طلا با واقعیت افزوده
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            قبل از خرید، طلا را روی بدن خود ببینید و بررسی کنید.
            این قابلیت در فاز ۲ به صورت کامل پیاده‌سازی می‌شود.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {arSteps.map((step, index) => (
            <div key={index} className="card p-6 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gold-50 flex items-center justify-center text-gold-600 mx-auto mb-4">
                {step.icon}
              </div>
              <h3 className="font-bold mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="card p-8 text-center">
          <div className="text-6xl mb-4">🔮</div>
          <h2 className="text-2xl font-bold mb-4">این قابلیت در فاز ۲ فعال می‌شود</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            تکنولوژی WebAR با MediaPipe برای تشخیص اعضای بدن و نمایش مدل‌های سه‌بعدی طلا
            با فریم‌ریت حداقل ۲۵ FPS روی گوشی‌های میان‌رده
          </p>
          <button className="px-8 py-3 rounded-xl bg-gold-500 text-white font-bold hover:bg-gold-600 transition-all">
            اطلاع‌رسانی زمان فعال‌سازی
          </button>
        </div>
      </div>
    </div>
  )
}
