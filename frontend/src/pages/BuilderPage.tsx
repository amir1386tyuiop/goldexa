import { useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Diamond, Hammer, Plus, Search, Sparkles, Wand2 } from 'lucide-react'
import { api, type CreateCustomBuilderQuoteInput, type CreateJewelryDesignInput } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { GemstoneLibrary, JewelryDesign } from '@/types'

const defaultUserId = '11111111-1111-1111-1111-111111111111'
const defaultUserName = 'داود احمدی'

export function BuilderPage() {
  const [activeTab, setActiveTab] = useState<'designs' | 'create' | 'gemstones' | 'quote'>('designs')
  const [search, setSearch] = useState('')

  const { data: designs = [] } = useQuery<JewelryDesign[]>({
    queryKey: ['jewelry-designs'],
    queryFn: api.getJewelryDesigns,
    initialData: [],
  })

  const { data: gemstones = [] } = useQuery<GemstoneLibrary[]>({
    queryKey: ['gemstones'],
    queryFn: api.getGemstones,
    initialData: [],
  })

  const filteredDesigns = useMemo(() => {
    if (!search) return designs
    const keyword = search.toLowerCase()
    return designs.filter(
      (design) => design.title.toLowerCase().includes(keyword) || design.category.toLowerCase().includes(keyword),
    )
  }, [designs, search])

  const createDesign = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const weight = Number(formData.get('weight'))
    const totalPrice = Number(formData.get('totalPrice'))

    api.createJewelryDesign({
      userId: defaultUserId,
      userName: defaultUserName,
      title: String(formData.get('title')),
      category: formData.get('category') as CreateJewelryDesignInput['category'],
      baseType: String(formData.get('baseType')),
      weight,
      karat: Number(formData.get('karat')),
      metalColor: String(formData.get('metalColor')),
      totalPrice,
      estimatedGoldPrice: Math.round(totalPrice * 0.72),
      laborCost: Number(formData.get('laborCost')),
      profit: Number(formData.get('profit')),
      tax: Number(formData.get('tax')),
      imageUrl: '/images/custom-ring.svg',
      modelUrl: '/models/custom-ring.glb',
      preview3dUrl: '/models/custom-ring-preview.glb',
      status: 'in_progress',
    })
  }

  const createQuote = () => {
    const latestDesign = filteredDesigns[0]
    if (!latestDesign) return

    const quote: CreateCustomBuilderQuoteInput = {
      userId: defaultUserId,
      designId: latestDesign.id,
      goldPriceSnapshot: latestDesign.estimatedGoldPrice,
      goldWeight: latestDesign.weight,
      laborCost: latestDesign.laborCost,
      profit: latestDesign.profit,
      tax: latestDesign.tax,
      total: latestDesign.totalPrice,
      status: 'sent',
    }

    api.createCustomBuilderQuote(quote)
  }

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-navy-900">طراحی طلای اختصاصی</h1>
            <p className="text-muted-foreground mt-2">ساخت طرح سفارشی، انتخاب سنگ، پیش‌نمایش سه‌بعدی و پیش‌فاکتور لحظه‌ای</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TabButton active={activeTab === 'designs'} onClick={() => setActiveTab('designs')}>طرح‌ها</TabButton>
            <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>طراحی جدید</TabButton>
            <TabButton active={activeTab === 'gemstones'} onClick={() => setActiveTab('gemstones')}>سنگ‌ها</TabButton>
            <TabButton active={activeTab === 'quote'} onClick={() => setActiveTab('quote')}>پیش‌فاکتور</TabButton>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="input pr-10"
                  placeholder="جستجوی طرح یا سنگ..."
                />
              </div>
            </div>

            {activeTab === 'create' ? (
              <CreateDesignPanel onSubmit={createDesign} />
            ) : activeTab === 'gemstones' ? (
              <GemstoneGrid gemstones={gemstones} />
            ) : activeTab === 'quote' ? (
              <QuotePanel design={filteredDesigns[0] || null} onCreate={createQuote} />
            ) : (
              <DesignGrid designs={filteredDesigns} />
            )}
          </div>

          <aside className="space-y-6">
            <BuilderSummary designs={designs} gemstones={gemstones} />
            <BuilderRulesPanel />
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

function DesignGrid({ designs }: { designs: JewelryDesign[] }) {
  if (designs.length === 0) {
    return <EmptyState title="طرحی ثبت نشده" description="اولین طرح طلای اختصاصی خود را بسازید." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {designs.map((design) => (
        <div key={design.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">{design.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{design.userName}</p>
            </div>
            <Wand2 className="h-5 w-5 text-gold-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="دسته" value={design.category} />
            <InfoPill label="وزن" value={`${design.weight} گرم`} />
            <InfoPill label="عیار" value={`${design.karat}`} />
            <InfoPill label="قیمت" value={formatPrice(design.totalPrice)} />
          </div>
        </div>
      ))}
    </div>
  )
}

function GemstoneGrid({ gemstones }: { gemstones: GemstoneLibrary[] }) {
  if (gemstones.length === 0) {
    return <EmptyState title="سنگی ثبت نشده" description="سنگ‌های قیمتی و نیمه‌قیمتی بعد از تعریف نمایش داده می‌شوند." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {gemstones.map((gemstone) => (
        <div key={gemstone.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">{gemstone.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{gemstone.type}</p>
            </div>
            <Diamond className="h-5 w-5 text-gold-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="رنگ" value={gemstone.color || 'نامشخص'} />
            <InfoPill label="موجودی" value={`${gemstone.stock} عدد`} />
            <InfoPill label="قیمت قیراط" value={formatPrice(gemstone.pricePerCarat)} />
            <InfoPill label="وضعیت" value={gemstone.isActive ? 'فعال' : 'غیرفعال'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function CreateDesignPanel({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form onSubmit={onSubmit} className="card p-6 space-y-4">
      <h2 className="text-xl font-black text-navy-900">طراحی جدید</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <input name="title" className="input" placeholder="عنوان طرح" required />
        <select name="category" className="input" required>
          <option value="ring">انگشتر</option>
          <option value="necklace">گردنبند</option>
          <option value="bracelet">دستبند</option>
          <option value="earring">گوشواره</option>
          <option value="pendant">آویز</option>
        </select>
        <select name="baseType" className="input">
          <option value="simple">ساده</option>
          <option value="half_diamond">نیم‌الماس</option>
          <option value="full_diamond">تمام‌الماس</option>
          <option value="stone_center">سنگ مرکزی</option>
        </select>
        <input name="metalColor" className="input" placeholder="رنگ فلز" />
        <input name="weight" type="number" step="0.01" className="input" placeholder="وزن گرم" required />
        <input name="karat" type="number" className="input" placeholder="عیار" defaultValue={18} required />
        <input name="laborCost" type="number" className="input" placeholder="اجرت ساخت" defaultValue={0} required />
        <input name="profit" type="number" className="input" placeholder="سود" defaultValue={0} required />
        <input name="tax" type="number" className="input" placeholder="مالیات درصد" defaultValue={9} required />
        <input name="totalPrice" type="number" className="input" placeholder="قیمت کل" required />
      </div>
      <button type="submit" className="button-primary w-full">
        <Plus className="h-4 w-4 ml-2" />
        ثبت طرح
      </button>
    </form>
  )
}

function QuotePanel({ design, onCreate }: { design: JewelryDesign | null; onCreate: () => void }) {
  if (!design) {
    return <EmptyState title="طرحی برای پیش‌فاکتور وجود ندارد" description="ابتدا یک طرح ثبت کنید." />
  }

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3">
        <Hammer className="h-6 w-6 text-gold-600" />
        <div>
          <h2 className="text-xl font-black text-navy-900">پیش‌فاکتور طرح</h2>
          <p className="text-sm text-muted-foreground mt-1">{design.title}</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <InfoPill label="قیمت طلا" value={formatPrice(design.estimatedGoldPrice)} />
        <InfoPill label="اجرت" value={formatPrice(design.laborCost)} />
        <InfoPill label="سود" value={formatPrice(design.profit)} />
        <InfoPill label="مالیات" value={`${design.tax}%`} />
        <InfoPill label="مجموع" value={formatPrice(design.totalPrice)} />
      </div>
      <button onClick={onCreate} className="button-primary w-full mt-5">
        <Sparkles className="h-4 w-4 ml-2" />
        صدور پیش‌فاکتور
      </button>
    </div>
  )
}

function BuilderSummary({ designs, gemstones }: { designs: JewelryDesign[]; gemstones: GemstoneLibrary[] }) {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-navy-900">خلاصه طراحی</h2>
      <div className="mt-5 space-y-3">
        <InfoPill label="تعداد طرح‌ها" value={String(designs.length)} />
        <InfoPill label="سنگ‌های فعال" value={String(gemstones.filter((item) => item.isActive).length)} />
        <InfoPill label="گران‌ترین طرح" value={designs.length ? formatPrice(Math.max(...designs.map((item) => item.totalPrice))) : '۰ تومان'} />
      </div>
    </div>
  )
}

function BuilderRulesPanel() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-black text-navy-900">قوانین طراحی</h2>
      <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
        <li>قیمت نهایی با وزن، عیار، سنگ‌ها و قیمت لحظه‌ای طلا محاسبه می‌شود.</li>
        <li>مدل GLB/glTF برای پیش‌نمایش سه‌بعدی و AR ثبت می‌شود.</li>
        <li>پیش‌فاکتور تا زمان انقضا قابل قبول یا رد است.</li>
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
