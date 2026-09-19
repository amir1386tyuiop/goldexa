import { useMemo, useState, type ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Clock, Gavel, Plus, Search, Star, TrendingUp, UserCheck } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { Auction, AuctionBid, Product, UsedGoldListing } from '@/types'
import { getStoredAuth } from '@/auth'

const emptyBidder: AuctionBid = {
  id: '',
  auctionId: '',
  bidderId: '',
  bidderName: '',
  amount: 0,
  isWinning: false,
  createdAt: '',
}

export function AuctionsPage({ initialTab = 'auctions' }: { initialTab?: 'auctions' | 'marketplace' | 'create' }) {
  const [activeTab, setActiveTab] = useState(initialTab)
  const [search, setSearch] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [selectedListing, setSelectedListing] = useState<UsedGoldListing | null>(null)
  const [purchaseAddress, setPurchaseAddress] = useState({
    title: 'آدرس تحویل',
    province: '',
    city: '',
    street: '',
    postalCode: '',
    isDefault: false,
  })
  const auth = getStoredAuth()
  const queryClient = useQueryClient()
  const [bidForm, setBidForm] = useState({ ...emptyBidder, bidderId: auth?.user.id || '', bidderName: auth?.user.name || '' })

  const { data: auctions = [], isLoading: auctionsLoading, isError: auctionsError } = useQuery<Auction[]>({
    queryKey: ['auctions'],
    queryFn: api.getAuctions,
    initialData: [],
    refetchInterval: 15000,
  })

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: () => api.getProducts(),
    initialData: [],
  })

  const { data: listings = [], isLoading: listingsLoading, isError: listingsError } = useQuery<UsedGoldListing[]>({
    queryKey: ['used-gold-listings'],
    queryFn: () => api.getUsedGoldListings(),
    initialData: [],
  })

  const { data: bids = [] } = useQuery<AuctionBid[]>({
    queryKey: ['auction-bids', selectedAuction?.id],
    queryFn: () => (selectedAuction ? api.getAuctionBids(selectedAuction.id) : Promise.resolve([])),
    initialData: [],
    enabled: Boolean(selectedAuction),
    refetchInterval: selectedAuction?.status === 'active' || selectedAuction?.status === 'extended' ? 10000 : false,
  })

  const bidMutation = useMutation({
    mutationFn: ({ auctionId, amount }: { auctionId: string; amount: number }) =>
      api.placeAuctionBid(auctionId, {
        bidderId: auth?.user.id || '',
        bidderName: auth?.user.name || '',
        amount,
      }),
    onSuccess: (updated) => {
      setSelectedAuction(updated)
      setBidForm({ ...emptyBidder, bidderId: auth?.user.id || '', bidderName: auth?.user.name || '' })
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      queryClient.invalidateQueries({ queryKey: ['auction-bids', updated.id] })
    },
  })

  const purchaseMutation = useMutation({
    mutationFn: (listingId: string) => api.purchaseUsedGoldListing(listingId, { address: purchaseAddress }),
    onSuccess: () => {
      setSelectedListing(null)
      queryClient.invalidateQueries({ queryKey: ['used-gold-listings'] })
    },
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
                  <input aria-label="جستجوی مزایده یا آگهی"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="input pr-10"
                    placeholder="جستجوی مزایده یا آگهی..."
                  />
                </div>
              </div>

              {activeTab === 'auctions' && auctionsLoading ? <LoadingState label="در حال بارگذاری مزایده‌ها..." /> : null}
              {activeTab === 'marketplace' && listingsLoading ? <LoadingState label="در حال بارگذاری آگهی‌ها..." /> : null}
              {activeTab === 'auctions' && auctionsError ? <ErrorState label="دریافت مزایده‌ها ناموفق بود." /> : null}
              {activeTab === 'marketplace' && listingsError ? <ErrorState label="دریافت آگهی‌ها ناموفق بود." /> : null}
              {activeTab === 'auctions' && !auctionsLoading && !auctionsError ? (
                <AuctionList
                  auctions={filteredAuctions}
                  selectedAuction={selectedAuction}
                onSelect={(auction) => {
                  setSelectedAuction(auction)
                  setBidForm({ ...emptyBidder, bidderId: auth?.user.id || '', bidderName: auth?.user.name || '' })
                }}
                />
              ) : activeTab === 'marketplace' && !listingsLoading && !listingsError ? (
                  <ListingList listings={filteredListings} selectedListing={selectedListing} onSelect={setSelectedListing} />
              ) : null}
            </div>

            <aside className="space-y-6">
              <AuctionDetailPanel
                auction={selectedAuction}
                bids={bids}
                bidForm={bidForm}
                minimumBid={minimumBid}
                onBidChange={setBidForm}
                onSubmitBid={() => {
                  if (!selectedAuction || !auth || bidForm.amount < minimumBid) return
                  bidMutation.mutate({ auctionId: selectedAuction.id, amount: bidForm.amount })
                }}
                isSubmitting={bidMutation.isPending}
                error={bidMutation.isError ? 'ثبت پیشنهاد انجام نشد؛ مبلغ یا وضعیت مزایده را بررسی کنید.' : undefined}
              />
              <AuctionRulesPanel />
              {activeTab === 'marketplace' && (
                <UsedGoldPurchasePanel
                  listing={selectedListing}
                  address={purchaseAddress}
                  onAddressChange={setPurchaseAddress}
                  onPurchase={() => selectedListing && purchaseMutation.mutate(selectedListing.id)}
                  isSubmitting={purchaseMutation.isPending}
                  error={purchaseMutation.isError ? 'خرید انجام نشد؛ موجودی کیف پول، آدرس و وضعیت آگهی را بررسی کنید.' : undefined}
                />
              )}
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
      type="button"
      aria-pressed={active}
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

function ListingList({ listings, selectedListing, onSelect }: { listings: UsedGoldListing[]; selectedListing: UsedGoldListing | null; onSelect: (listing: UsedGoldListing) => void }) {
  if (listings.length === 0) {
    return <EmptyState title="آگهی یافت نشد" description="آگهی‌های طلای دست دوم بعد از تأیید ادمین نمایش داده می‌شوند." />
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {listings.map((listing) => (
        <button key={listing.id} type="button" onClick={() => onSelect(listing)} className={`card w-full p-5 text-right transition ${selectedListing?.id === listing.id ? 'ring-2 ring-amber-500' : 'hover:shadow-lg'}`}>
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
        </button>
      ))}
    </div>
  )
}

function UsedGoldPurchasePanel({
  listing,
  address,
  onAddressChange,
  onPurchase,
  isSubmitting,
  error,
}: {
  listing: UsedGoldListing | null
  address: { title: string; province: string; city: string; street: string; postalCode: string; isDefault: boolean }
  onAddressChange: (value: { title: string; province: string; city: string; street: string; postalCode: string; isDefault: boolean }) => void
  onPurchase: () => void
  isSubmitting: boolean
  error?: string
}) {
  if (!listing) return <div className="card p-5 text-sm text-muted-foreground">برای خرید مستقیم، یک آگهی را انتخاب کنید.</div>
  const update = (key: 'province' | 'city' | 'street' | 'postalCode', value: string) => onAddressChange({ ...address, [key]: value })
  const ready = Boolean(address.province && address.city && address.street && address.postalCode)
  return <section className="card p-5" aria-labelledby="used-gold-purchase-title">
    <h2 id="used-gold-purchase-title" className="font-black text-navy-900">خرید امن با کیف پول</h2>
    <p className="mt-2 text-sm text-muted-foreground">مبلغ تا تأیید تحویل در escrow نگه داشته می‌شود.</p>
    <p className="mt-4 font-bold">{listing.title} · {formatPrice(listing.fixedPrice || 0)} تومان</p>
    <div className="mt-4 space-y-3">
      <input className="input" aria-label="استان" placeholder="استان" value={address.province} onChange={(event) => update('province', event.target.value)} />
      <input className="input" aria-label="شهر" placeholder="شهر" value={address.city} onChange={(event) => update('city', event.target.value)} />
      <textarea className="input min-h-20" aria-label="نشانی" placeholder="نشانی کامل" value={address.street} onChange={(event) => update('street', event.target.value)} />
      <input className="input" aria-label="کد پستی" placeholder="کد پستی" value={address.postalCode} onChange={(event) => update('postalCode', event.target.value)} />
    </div>
    <button type="button" className="btn btn-primary mt-4 w-full" disabled={!ready || isSubmitting} onClick={onPurchase}>{isSubmitting ? 'در حال ثبت معامله…' : 'خرید و نگهداری مبلغ در escrow'}</button>
    {error && <p className="mt-3 text-sm text-red-700" role="alert">{error}</p>}
  </section>
}

function AuctionDetailPanel({
  auction,
  bids,
  bidForm,
  minimumBid,
  onBidChange,
  onSubmitBid,
  isSubmitting,
  error,
}: {
  auction: Auction | null
  bids: AuctionBid[]
  bidForm: AuctionBid
  minimumBid: number
  onBidChange: (form: AuctionBid) => void
  onSubmitBid: () => void
  isSubmitting: boolean
  error?: string
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
          <p className="text-xs text-muted-foreground">پیشنهاد با حساب کاربری شما ثبت می‌شود.</p>
          <input
            type="number"
            value={bidForm.amount || ''}
            onChange={(event) => onBidChange({ ...bidForm, amount: Number(event.target.value) })}
            className="input"
            placeholder={`حداقل ${formatPrice(minimumBid)} تومان`}
          />
          <button disabled={isSubmitting || auction.status !== 'active' || bidForm.amount < minimumBid} onClick={onSubmitBid} className="btn btn-primary w-full disabled:opacity-50">
            ثبت پیشنهاد
          </button>
          {error ? <p role="alert" className="text-xs text-red-700 mt-2">{error}</p> : null}
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
    sellerId: getStoredAuth()?.user.id || '',
    sellerName: getStoredAuth()?.user.name || '',
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

function LoadingState({ label }: { label: string }) {
  return <div role="status" className="card p-10 text-center text-muted-foreground">{label}</div>
}

function ErrorState({ label }: { label: string }) {
  return <div role="alert" className="card border-red-200 bg-red-50 p-6 text-center text-red-800">{label}</div>
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
