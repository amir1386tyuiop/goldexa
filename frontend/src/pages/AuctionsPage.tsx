import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Clock, Gavel, Plus, Search, Star, TrendingUp, UserCheck } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { Auction, AuctionBid, Product, UsedGoldListing } from '@/types'

const defaultUserId = '11111111-1111-1111-1111-111111111111'

const defaultBidder: AuctionBid = {
  id: '',
  auctionId: '',
  bidderId: defaultUserId,
  bidderName: 'داود احمدی',
  amount: 0,
  isWinning: false,
  createdAt: '',
}

export function AuctionsPage({ initialTab = 'auctions' }: { initialTab?: 'auctions' | 'marketplace' | 'create' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [search, setSearch] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [bidForm, setBidForm] = useState(defaultBidder)

  const { data: auctions = [] } = useQuery<Auction[]>({
    queryKey: ['auctions'],
    queryFn: api.getAuctions,
    initialData: [],
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    initialData: [],
  })

  const { data: listings = [] } = useQuery<UsedGoldListing[]>({
    queryKey: ['used-gold-listings'],
    queryFn: () => api.getUsedGoldListings(),
    initialData: [],
  })

  const { data: bids = [] } = useQuery<AuctionBid[]>({
    queryKey: ['auction-bids', selectedAuction?.id],
    queryFn: () => (selectedAuction ? api.getAuctionBids(selectedAuction.id) : Promise.resolve([])),
    initialData: [],
    enabled: Boolean(selectedAuction),
  })

  const filteredAuctions = useMemo(() => {
    if (!search) return auctions
    const keyword = search.toLowerCase()
    return auctions.filter(
      (auction) =>
        auction.product?.name.toLowerCase().includes(keyword) ||
        auction.sellerName.toLowerCase().includes(keyword) ||
        auction.notes?.toLowerCase().includes(keyword)
    )
  }, [auctions, search])

  const filteredListings = useMemo(() => {
    if (!search) return listings
    const keyword = search.toLowerCase()
    return listings.filter(
      (listing) =>
        listing.title.toLowerCase().includes(keyword) ||
        listing.description.toLowerCase().includes(keyword) ||
        listing.sellerName.toLowerCase().includes(keyword)
    )
  }, [listings, search])

  const minimumBid = selectedAuction
    ? selectedAuction.currentPrice + selectedAuction.minimumBidIncrement
    : 0

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-navy-900">مزایده و بازار دست دوم طلا</h1>
            <p className="text-muted-foreground mt-2">
              ثبت پیشنهاد، خرید مستقیم طلای دست دوم، تأیید کارشناسی و تسویه امن
            </p>
          </div>
          <div className="flex gap-2">
            <TabButton active={activeTab === 'auctions'} onClick={() => setActiveTab('auctions')}>
              مزایده‌ها
            </TabButton>
            <TabButton active={activeTab === 'marketplace'} onClick={() => setActiveTab('marketplace')}>
              بازار دست دوم
            </TabButton>
            <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')}>
              ثبت آگهی
            </TabButton>
          </div>
        </div>

        {activeTab === 'create' ? (
          <CreateListingPanel products={products} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-5">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input pr-10"
                    placeholder="جستجوی مزایده یا آگهی..."
                  />
                </div>
              </div>

              {activeTab === 'auctions' ? (
                <AuctionList
                  auctions={filteredAuctions}
                  selectedAuction={selectedAuction}
                  onSelect={setSelectedAuction}
                />
              ) : (
                <ListingList listings={filteredListings} />
              )}
            </div>

            <aside className="space-y-6">
              <AuctionDetailPanel
                auction={selectedAuction}
                bids={bids}
                bidForm={bidForm}
                minimumBid={minimumBid}
                onBidChange={setBidForm}
                onSubmitBid={() => {
                  if (!selectedAuction) return
                  api.placeAuctionBid(selectedAuction.id, {
                    bidderId: bidForm.bidderId,
                    bidderName: bidForm.bidderName,
                    amount: bidForm.amount,
                  })
                  setBidForm(defaultBidder)
                }}
              />
              <AuctionRulesPanel />
            </aside>
          </div>
        )}
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

function AuctionList({
  auctions,
  selectedAuction,
  onSelect,
}: {
  auctions: Auction[]
  selectedAuction: Auction | null
  onSelect: (auction: Auction) => void
}) {
  if (auctions.length === 0) {
    return <EmptyState title="مزایده‌ای ثبت نشده" description="بعد از تأیید کارشناسی، مزایده‌های فعال اینجا نمایش داده می‌شوند." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {auctions.map((auction) => (
        <button
          key={auction.id}
          onClick={() => onSelect(auction)}
          className={`card p-5 text-right transition-all ${
            selectedAuction?.id === auction.id ? 'ring-2 ring-gold-500' : 'hover:shadow-lg'
          }`}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">{auction.product?.name || 'طلای دست دوم'}</h3>
              <p className="text-sm text-muted-foreground mt-1">{auction.sellerName}</p>
            </div>
            <Gavel className="h-5 w-5 text-gold-600" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="قیمت فعلی" value={formatPrice(auction.currentPrice)} />
            <InfoPill label="حداقل افزایش" value={formatPrice(auction.minimumBidIncrement)} />
            <InfoPill label="پایان" value={new Date(auction.endsAt).toLocaleDateString('fa-IR')} />
            <InfoPill label="وضعیت" value={getAuctionStatusText(auction.status)} />
          </div>
          {auction.reservePrice ? (
            <p className="text-xs text-muted-foreground mt-3">
              قیمت رزرو: {formatPrice(auction.reservePrice)} تومان
            </p>
          ) : null}
        </button>
      ))}
    </div>
  )
}

function ListingList({ listings }: { listings: UsedGoldListing[] }) {
  if (listings.length === 0) {
    return <EmptyState title="آگهی یافت نشد" description="آگهی‌های طلای دست دوم بعد از تأیید ادمین نمایش داده می‌شوند." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {listings.map((listing) => (
        <div key={listing.id} className="card p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-black text-navy-900">{listing.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{listing.sellerName}</p>
            </div>
            {listing.qualityBadge ? <Star className="h-5 w-5 text-gold-500" /> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{listing.description}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <InfoPill label="وزن" value={`${listing.weight} گرم`} />
            <InfoPill label="عیار" value={`${listing.karat}`} />
            <InfoPill
              label="قیمت"
              value={
                listing.saleType === 'auction'
                  ? `پایه ${formatPrice(listing.startingPrice || 0)}`
                  : formatPrice(listing.fixedPrice || 0)
              }
            />
            <InfoPill label="نوع فروش" value={listing.saleType === 'auction' ? 'مزایده' : 'مستقیم'} />
          </div>
        </div>
      ))}
    </div>
  )
}

function AuctionDetailPanel({
  auction,
  bids,
  bidForm,
  minimumBid,
  onBidChange,
  onSubmitBid,
}: {
  auction: Auction | null
  bids: AuctionBid[]
  bidForm: AuctionBid
  minimumBid: number
  onBidChange: (form: AuctionBid) => void
  onSubmitBid: () => void
}) {
  if (!auction) {
    return (
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4">جزئیات مزایده</h2>
        <EmptyState title="مزایده انتخاب نشده" description="برای ثبت پیشنهاد، یک مزایده را از لیست انتخاب کنید." />
      </div>
    )
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-2">{auction.product?.name || 'طلای دست دوم'}</h2>
        <p className="text-sm text-muted-foreground">{auction.notes || 'بدون توضیحات'}</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <InfoPill label="قیمت فعلی" value={formatPrice(auction.currentPrice)} />
        <InfoPill label="حداقل پیشنهاد" value={formatPrice(minimumBid)} />
        <InfoPill label="تعداد پیشنهاد" value={String(auction.bidCount)} />
        <InfoPill label="تمدید خودکار" value={`${auction.autoExtendMinutes} دقیقه`} />
      </div>

      <div className="rounded-2xl bg-gray-50 p-4">
        <h3 className="font-bold mb-3">ثبت پیشنهاد جدید</h3>
        <div className="space-y-3">
          <input
            value={bidForm.bidderName}
            onChange={(event) => onBidChange({ ...bidForm, bidderName: event.target.value })}
            className="input"
            placeholder="نام پیشنهاددهنده"
          />
          <input
            type="number"
            value={bidForm.amount || ''}
            onChange={(event) => onBidChange({ ...bidForm, amount: Number(event.target.value) })}
            className="input"
            placeholder={`حداقل ${formatPrice(minimumBid)} تومان`}
          />
          <button onClick={onSubmitBid} className="btn btn-primary w-full">
            ثبت پیشنهاد
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-bold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          تاریخچه پیشنهادها
        </h3>
        {bids.length === 0 ? (
          <p className="text-sm text-muted-foreground">هنوز پیشنهادی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2">
            {bids.map((bid) => (
              <div key={bid.id} className="flex items-center justify-between rounded-xl bg-gray-50 p-3 text-sm">
                <span>{bid.bidderName}</span>
                <span className="font-bold">{formatPrice(bid.amount)} تومان</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function CreateListingPanel({ products }: { products: Product[] }) {
  const [form, setForm] = useState({
    sellerId: defaultUserId,
    sellerName: 'داود احمدی',
    productId: products[0]?.id || '',
    title: '',
    description: '',
    weight: '',
    karat: '18',
    saleType: 'auction',
    startingPrice: '',
    fixedPrice: '',
  })

  return (
    <div className="card p-6">
      <div className="flex items-center gap-3 mb-6">
        <Plus className="h-6 w-6 text-gold-600" />
        <div>
          <h2 className="text-xl font-bold">ثبت طلای دست دوم یا مزایده</h2>
          <p className="text-sm text-muted-foreground">
            اطلاعات اولیه وارد می‌شود و پس از تأیید کارشناس گلدکسا منتشر می‌شود.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <select
          value={form.productId}
          onChange={(event) => setForm({ ...form, productId: event.target.value })}
          className="input"
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
        <input
          value={form.title}
          onChange={(event) => setForm({ ...form, title: event.target.value })}
          className="input"
          placeholder="عنوان آگهی"
        />
        <textarea
          value={form.description}
          onChange={(event) => setForm({ ...form, description: event.target.value })}
          className="input min-h-28"
          placeholder="توضیحات، وضعیت قطعه، فاکتور و ..."
        />
        <input
          type="number"
          value={form.weight}
          onChange={(event) => setForm({ ...form, weight: event.target.value })}
          className="input"
          placeholder="وزن به گرم"
        />
        <select
          value={form.saleType}
          onChange={(event) => setForm({ ...form, saleType: event.target.value })}
          className="input"
        >
          <option value="auction">مزایده</option>
          <option value="direct">فروش مستقیم</option>
        </select>
        <input
          type="number"
          value={form.saleType === 'auction' ? form.startingPrice : form.fixedPrice}
          onChange={(event) =>
            setForm({
              ...form,
              startingPrice: form.saleType === 'auction' ? event.target.value : form.startingPrice,
              fixedPrice: form.saleType === 'direct' ? event.target.value : form.fixedPrice,
            })
          }
          className="input"
          placeholder={form.saleType === 'auction' ? 'قیمت پایه مزایده' : 'قیمت ثابت فروش'}
        />
        <input
          value={form.karat}
          onChange={(event) => setForm({ ...form, karat: event.target.value })}
          className="input"
          placeholder="عیار"
        />
      </div>

      <button className="btn btn-primary mt-6 w-full md:w-auto">
        ارسال برای بررسی کارشناسی
      </button>
    </div>
  )
}

function AuctionRulesPanel() {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold mb-4">قوانین مزایده طلا</h2>
      <ul className="space-y-3 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <TrendingUp className="h-4 w-4 mt-1 text-gold-600" />
          هر پیشنهاد باید از پیشنهاد قبلی بالاتر باشد.
        </li>
        <li className="flex gap-2">
          <Clock className="h-4 w-4 mt-1 text-gold-600" />
          پیشنهاد در ۲ دقیقه پایانی، مزایده را ۵ دقیقه تمدید می‌کند.
        </li>
        <li className="flex gap-2">
          <UserCheck className="h-4 w-4 mt-1 text-gold-600" />
          طلا پیش از ارسال به خریدار توسط کارشناس گلدکسا بررسی می‌شود.
        </li>
        <li className="flex gap-2">
          <Gavel className="h-4 w-4 mt-1 text-gold-600" />
          در صورت عدم پرداخت برنده، نفر دوم جایگزین می‌شود.
        </li>
      </ul>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-bold text-navy-900 mt-1">{value}</p>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="text-center py-16 border border-dashed border-border rounded-2xl bg-gray-50">
      <Gavel className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
      <h3 className="text-lg font-bold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function getAuctionStatusText(status: string): string {
  const labels: Record<string, string> = {
    pending_review: 'در انتظار بررسی',
    scheduled: 'زمان‌بندی‌شده',
    active: 'فعال',
    extended: 'تمدیدشده',
    ended: 'پایان‌یافته',
    awaiting_payment: 'در انتظار پرداخت',
    completed: 'تکمیل‌شده',
    cancelled: 'لغوشده',
    failed: 'ناموفق',
  }

  return labels[status] || status
}
