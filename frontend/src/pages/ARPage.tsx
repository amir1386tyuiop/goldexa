import { Camera, ExternalLink, Sparkles, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { ArModel } from '@/types'

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
  const [selectedModel, setSelectedModel] = useState<string | null>(null)
  const [viewerReady, setViewerReady] = useState(false)
  const arEnabled = import.meta.env.VITE_AR_ENABLED === 'true'
  const { data: models = [], isLoading, isError } = useQuery<ArModel[]>({
    queryKey: ['ar-models'],
    queryFn: api.getArModels,
    initialData: [],
  })
  const activeModel = models.find((model) => model.id === selectedModel) || null
  useEffect(() => {
    if (!arEnabled || !activeModel?.modelUrl || viewerReady) return
    void import('@google/model-viewer').then(() => setViewerReady(true)).catch(() => setViewerReady(false))
  }, [activeModel?.modelUrl, arEnabled, viewerReady])

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-3xl md:text-4xl font-black text-navy-900 mb-4">
            پرو مجازی طلا با واقعیت افزوده
          </h1>
          <p className="text-muted-foreground leading-relaxed">
            قبل از خرید، طلا را روی بدن خود ببینید و بررسی کنید.
            مدل‌های سه‌بعدی آماده را ببینید و در صورت فعال‌بودن سرویس WebAR، پرو مجازی را اجرا کنید.
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
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-50 text-gold-700" aria-hidden="true"><Sparkles className="h-8 w-8" /></div>
          <h2 className="text-2xl font-bold mb-4">{arEnabled ? 'آماده‌سازی پرو مجازی' : 'پرو مجازی فعلاً غیرفعال است'}</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            تکنولوژی WebAR با MediaPipe برای تشخیص اعضای بدن و نمایش مدل‌های سه‌بعدی طلا
            با فریم‌ریت حداقل ۲۵ FPS روی گوشی‌های میان‌رده
          </p>
          <button type="button" className="btn btn-primary min-h-11" disabled={!arEnabled || !models.length} onClick={() => setSelectedModel(models[0]?.id || null)}>
            {arEnabled ? 'شروع پرو مجازی' : 'در انتظار فعال‌سازی سرویس'}
          </button>
          {models.length > 0 && <div className="mt-8 grid gap-4 text-right sm:grid-cols-2">{models.map((model) => <button type="button" key={model.id} onClick={() => setSelectedModel(model.id)} className={`rounded-2xl border p-4 text-right transition ${selectedModel === model.id ? 'border-amber-600 bg-amber-50' : 'border-stone-200 hover:border-amber-400'}`}><span className="flex items-center justify-between gap-3"><span className="font-bold">{model.name}</span><ExternalLink className="h-4 w-4 text-amber-700" aria-hidden="true" /></span><span className="mt-2 block text-xs text-stone-500">مدل سه‌بعدی {model.modelUrl ? 'آماده' : 'ثبت نشده'}</span></button>)}</div>}
          {activeModel?.modelUrl && arEnabled && viewerReady ? <div className="mt-6 overflow-hidden rounded-3xl border border-stone-200 bg-stone-950 p-2"><model-viewer src={activeModel.modelUrl} poster={activeModel.thumbnailUrl || undefined} alt={`پیش‌نمایش سه‌بعدی ${activeModel.name}`} ar ar-modes="webxr scene-viewer quick-look" camera-controls auto-rotate exposure="1" shadow-intensity="1" interaction-prompt="auto" className="h-[22rem] w-full rounded-2xl bg-stone-900" /><p className="px-3 py-2 text-right text-xs text-stone-300">مدل را بچرخانید و در دستگاه سازگار، گزینه‌ی AR را برای مشاهده روی محیط واقعی انتخاب کنید.</p></div> : selectedModel ? <p className="mt-4 text-sm text-amber-800" role="status">{activeModel?.modelUrl && arEnabled ? 'در حال آماده‌سازی viewer سه‌بعدی…' : 'برای این مدل، فایل GLB/glTF معتبر یا فعال‌سازی WebAR هنوز تنظیم نشده است.'}</p> : null}
          <div className="mt-6 text-right" aria-live="polite">
            {isLoading ? <p className="text-sm text-muted-foreground">در حال بررسی مدل‌های AR...</p> : null}
            {isError ? <p role="alert" className="text-sm text-red-700">مدل‌های AR فعلاً در دسترس نیستند.</p> : null}
            {!isLoading && !isError && models.length > 0 ? <p className="text-sm text-muted-foreground">{models.length} مدل برای فعال‌سازی آینده آماده است.</p> : null}
          </div>
        </div>
      </div>
    </div>
  )
}
