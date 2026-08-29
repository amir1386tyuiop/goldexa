import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Gavel,
  Clock,
  TrendingUp,
  Search,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Package,
  User,
  CreditCard,
  ShieldCheck,
} from 'lucide-react'
import { api, type CreateAuctionInput, type PlaceAuctionBidInput } from '@/api/client'
import type { Auction, AuctionBid } from '@/types'
import { formatPrice, getAuctionPaymentText, getAuctionStatusBadge, getAuctionStatusText } from '@/utils/helpers'
import { getStoredAuth } from '@/auth'

export function AuctionPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedAuction, setSelectedAuction] = useState<Auction | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [createPanelOpen, setCreatePanelOpen] = useState(false)
  const auth = getStoredAuth()
  const [createAuction, setCreateAuction] = useState<CreateAuctionInput>({
    productId: '',
    sellerId: auth?.user.id || '',
    sellerName: auth?.user.name || '',
    startingPrice: 0,
    reservePrice: null,
    minimumBidIncrement: 500000,
    startsAt: '',
    endsAt: '',
    notes: '',
  })

  const { data: auctions = [], isLoading, isError: auctionsError } = useQuery({
    queryKey: ['auctions'],
    queryFn: api.getAuctions,
    initialData: [],
    refetchInterval: 15000,
  })

  const { data: products = [] } = useQuery({
    queryKey: ['auction-products'],
    queryFn: () => api.getProducts(),
    initialData: [],
  })

  const createAuctionMutation = useMutation({
    mutationFn: api.createAuction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      setCreatePanelOpen(false)
      setCreateAuction({
        productId: '',
        sellerId: auth?.user.id || '',
        sellerName: auth?.user.name || '',
        startingPrice: 0,
        reservePrice: null,
        minimumBidIncrement: 500000,
        startsAt: '',
        endsAt: '',
        notes: '',
      })
    },
  })

  const placeBidMutation = useMutation({
    mutationFn: ({ auctionId, body }: { auctionId: string; body: PlaceAuctionBidInput }) =>
      api.placeAuctionBid(auctionId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
      setBidAmount('')
    },
  })

  const settleAuctionMutation = useMutation({
    mutationFn: ({ auctionId, amount }: { auctionId: string; amount: number }) =>
      api.settleAuction(auctionId, {
        winnerId: auth?.user.id || null,
        winnerName: auth?.user.name || null,
        amount,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
    },
  })

  const cancelAuctionMutation = useMutation({
    mutationFn: api.cancelAuction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auctions'] })
    },
  })

  const { data: bids = [] } = useQuery<AuctionBid[]>({
    queryKey: ['auction-bids', selectedAuction?.id],
    queryFn: () => (selectedAuction ? api.getAuctionBids(selectedAuction.id) : Promise.resolve([])),
    initialData: [],
    enabled: Boolean(selectedAuction),
    refetchInterval: selectedAuction?.status === 'active' || selectedAuction?.status === 'extended' ? 10000 : false,
  })

  const filteredAuctions = useMemo(() => {
    const keyword = search.trim().toLowerCase()

    return auctions
      .filter((auction) => !statusFilter || auction.status === statusFilter)
      .filter((auction) => {
        if (!keyword) return true
        return (
          auction.product?.name.toLowerCase().includes(keyword) ||
          auction.sellerName.toLowerCase().includes(keyword) ||
          auction.notes?.toLowerCase().includes(keyword)
        )
      })
      .sort((a, b) => {
        if (a.status === 'active' && b.status !== 'active') return -1
        if (a.status !== 'active' && b.status === 'active') return 1
        return new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime()
      })
  }, [auctions, search, statusFilter])

  const activeAuctions = auctions.filter((auction) => auction.status === 'active').length
  const scheduledAuctions = auctions.filter((auction) => auction.status === 'scheduled').length
  const auctionRevenue = auctions.reduce(
    (total, auction) => total + (auction.paymentStatus === 'paid' ? Number(auction.winningAmount || 0) : 0),
    0,
  )

  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-2xl bg-gold-500 text-white flex items-center justify-center">
                <Gavel className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-navy-900">مزایده طلا</h1>
                <p className="text-muted-foreground">ثبت پیشنهاد، مدیریت مزایده‌ها و پیگیری برنده نهایی</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
              <SummaryCard icon={<Clock className="h-5 w-5" />} label="مزایده فعال" value={activeAuctions} />
              <SummaryCard icon={<TrendingUp className="h-5 w-5" />} label="در شرف شروع" value={scheduledAuctions} />
              <SummaryCard icon={<CreditCard className="h-5 w-5" />} label="درآمد مزایده" value={`${formatPrice(auctionRevenue)} تومان`} />
              <SummaryCard icon={<ShieldCheck className="h-5 w-5" />} label="کل مزایده‌ها" value={auctions.length} />
            </div>
          </div>

          <button
            onClick={() => setCreatePanelOpen(true)}
            className="btn btn-primary gap-2"
          >
            <Plus className="h-5 w-5" />
            تعریف مزایده جدید
          </button>
        </div>

        {createPanelOpen && (
          <CreateAuctionPanel
            products={products}
            value={createAuction}
            onChange={setCreateAuction}
            onSubmit={() => createAuctionMutation.mutate(createAuction)}
            onClose={() => setCreatePanelOpen(false)}
            isSubmitting={createAuctionMutation.isPending}
          />
        )}

        <div className="card p-5 mb-6">
          <div className="flex flex-col md:flex-row gap-3 md:items-center">
            <div className="relative flex-1">
              <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pr-12"
                placeholder="جستجوی محصول، فروشنده یا توضیحات..."
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input md:w-48"
            >
              <option value="">همه وضعیت‌ها</option>
              <option value="scheduled">زمان‌بندی‌شده</option>
              <option value="active">در حال برگزاری</option>
              <option value="ended">پایان یافته</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 card">در حال بارگذاری مزایده‌ها...</div>
        ) : auctionsError ? (
          <div role="alert" className="text-center py-12 card border-red-200 bg-red-50 text-red-800">
            دریافت مزایده‌ها ناموفق بود. لطفاً دوباره تلاش کنید.
          </div>
        ) : filteredAuctions.length === 0 ? (
          <EmptyAuctionState />
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAuctions.map((auction) => (
                <AuctionCard
                  key={auction.id}
                  auction={auction}
                  selected={selectedAuction?.id === auction.id}
                  onSelect={() => setSelectedAuction(auction)}
                />
              ))}
            </div>

            <div className="xl:col-span-1">
              {selectedAuction ? (
                <AuctionDetailPanel
                  auction={selectedAuction}
                  bids={bids}
                  bidAmount={bidAmount}
                  onBidAmountChange={setBidAmount}
                  onPlaceBid={() => {
                    placeBidMutation.mutate({
                      auctionId: selectedAuction.id,
                      body: {
            bidderId: auth?.user.id || '',
            bidderName: auth?.user.name || '',
                        amount: Number(bidAmount),
                      },
                    })
                  }}
                  onSettle={() => {
                    settleAuctionMutation.mutate({
                      auctionId: selectedAuction.id,
                      amount: Number(selectedAuction.winningAmount || selectedAuction.currentPrice),
                    })
                  }}
                  onCancel={() => cancelAuctionMutation.mutate(selectedAuction.id)}
                  isBidding={placeBidMutation.isPending}
                  isSettling={settleAuctionMutation.isPending}
                  isCancelling={cancelAuctionMutation.isPending}
                  error={placeBidMutation.isError ? 'ثبت پیشنهاد انجام نشد؛ مبلغ یا وضعیت مزایده را بررسی کنید.' : undefined}
                />
              ) : (
                <EmptyAuctionDetailState />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-gold-600 mb-2">{icon}<span className="text-sm font-bold">{label}</span></div>
      <p className="text-2xl font-black text-navy-900">{value}</p>
    </div>
  )
}

function CreateAuctionPanel({
  products,
  value,
  onChange,
  onSubmit,
  onClose,
  isSubmitting,
}: {
  products: { id: string; name: string; finalPrice: number }[]
  value: CreateAuctionInput
  onChange: (value: CreateAuctionInput) => void
  onSubmit: () => void
  onClose: () => void
  isSubmitting: boolean
}) {
  const selectedProduct = products.find((product) => product.id === value.productId)

  const update = (patch: Partial<CreateAuctionInput>) => {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="card p-6 mb-6 border-gold-500/40">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold">تعریف مزایده جدید</h2>
          <p className="text-sm text-muted-foreground">محصول را انتخاب کنید و بازه زمانی مزایده را مشخص کنید.</p>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100"><XCircle className="h-5 w-5" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="md:col-span-2">
          <label className="text-xs text-muted-foreground mb-1 block">محصول</label>
          <select
            value={value.productId || ''}
            onChange={(event) => {
              const product = products.find((item) => item.id === event.target.value)
              update({ productId: event.target.value, startingPrice: product?.finalPrice || value.startingPrice })
            }}
            className="input"
          >
            <option value="">انتخاب محصول</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">قیمت شروع</label>
          <input
            type="number"
            value={value.startingPrice}
            onChange={(event) => update({ startingPrice: Number(event.target.value) })}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">حداقل افزایش پیشنهاد</label>
          <input
            type="number"
            value={value.minimumBidIncrement}
            onChange={(event) => update({ minimumBidIncrement: Number(event.target.value) })}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">قیمت رزرو اختیاری</label>
          <input
            type="number"
            value={value.reservePrice || ''}
            onChange={(event) => update({ reservePrice: event.target.value ? Number(event.target.value) : null })}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">شروع</label>
          <input
            type="datetime-local"
            value={value.startsAt}
            onChange={(event) => update({ startsAt: event.target.value })}
            className="input"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground mb-1 block">پایان</label>
          <input
            type="datetime-local"
            value={value.endsAt}
            onChange={(event) => update({ endsAt: event.target.value })}
            className="input"
          />
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {selectedProduct ? `قیمت فعلی محصول: ${formatPrice(selectedProduct.finalPrice)} تومان` : 'برای ادامه محصول انتخاب کنید.'}
        </p>
        <button
          disabled={!value.productId || !value.startsAt || !value.endsAt || isSubmitting}
          onClick={onSubmit}
          className="btn btn-primary gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          ثبت مزایده
        </button>
      </div>
    </div>
  )
}

function AuctionCard({
  auction,
  selected,
  onSelect,
}: {
  auction: Auction
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={`card overflow-hidden text-right transition-all hover:-translate-y-1 hover:shadow-lg ${
        selected ? 'ring-2 ring-gold-500' : ''
      }`}
    >
      <div className="h-48 bg-gradient-to-br from-gold-50 to-gray-100 flex items-center justify-center relative overflow-hidden">
        <img
          src={auction.product?.images?.[0] || '/images/ring-1.svg'}
          alt={auction.product?.name}
          className="h-full w-full object-cover"
        />
        <span className={`absolute top-3 right-3 badge ${getAuctionStatusBadge(auction.status)}`}>
          {getAuctionStatusText(auction.status)}
        </span>
      </div>

      <div className="p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <p className="text-xs text-gold-600 font-bold mb-1">مزایده {auction.id.slice(0, 8)}</p>
            <h3 className="font-black text-navy-900 leading-relaxed">{auction.product?.name}</h3>
          </div>
          <Package className="h-5 w-5 text-gold-600 flex-shrink-0" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <InfoPill label="قیمت فعلی" value={`${formatPrice(auction.currentPrice)} تومان`} />
          <InfoPill label="حداقل افزایش" value={`${formatPrice(auction.minimumBidIncrement)} تومان`} />
          <InfoPill label="تعداد پیشنهاد" value={`${auction.bidCount} بار`} />
          <InfoPill label="زمان باقی‌مانده" value={getAuctionCountdown(auction)} />
        </div>

        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>فروشنده: {auction.sellerName}</span>
          <span>{getAuctionPaymentText(auction.paymentStatus)}</span>
        </div>
      </div>
    </button>
  )
}

function AuctionDetailPanel({
  auction,
  bids,
  bidAmount,
  onBidAmountChange,
  onPlaceBid,
  onSettle,
  onCancel,
  isBidding,
  isSettling,
  isCancelling,
  error,
}: {
  auction: Auction
  bids: AuctionBid[]
  bidAmount: string
  onBidAmountChange: (value: string) => void
  onPlaceBid: () => void
  onSettle: () => void
  onCancel: () => void
  isBidding: boolean
  isSettling: boolean
  isCancelling: boolean
  error?: string
}) {
  const minimumBid = auction.currentPrice + auction.minimumBidIncrement

  return (
    <div className="card p-6 sticky top-24">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">جزئیات مزایده</h2>
          <p className="text-sm text-muted-foreground">{auction.product?.name}</p>
        </div>
        <span className={`badge ${getAuctionStatusBadge(auction.status)}`}>{getAuctionStatusText(auction.status)}</span>
      </div>

      <div className="space-y-4 mb-6">
        <DetailRow label="قیمت شروع" value={`${formatPrice(auction.startingPrice)} تومان`} />
        <DetailRow label="قیمت فعلی" value={`${formatPrice(auction.currentPrice)} تومان`} />
        <DetailRow label="حداقل پیشنهاد بعدی" value={`${formatPrice(minimumBid)} تومان`} />
        <DetailRow label="قیمت رزرو" value={auction.reservePrice ? `${formatPrice(auction.reservePrice)} تومان` : 'ندارد'} />
        <DetailRow label="زمان شروع" value={new Date(auction.startsAt).toLocaleString('fa-IR')} />
        <DetailRow label="زمان پایان" value={new Date(auction.endsAt).toLocaleString('fa-IR')} />
        <DetailRow label="برنده فعلی" value={auction.winningBidderName || 'ثبت نشده'} />
        <DetailRow label="وضعیت پرداخت" value={getAuctionPaymentText(auction.paymentStatus)} />
      </div>

      {auction.notes && (
        <div className="p-4 rounded-xl bg-gold-50 border border-gold-500/30 text-sm text-muted-foreground mb-5">
          {auction.notes}
        </div>
      )}

      <div className="mb-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm">تاریخچه پیشنهادها</h3>
          <span className="text-xs text-muted-foreground">{bids.length} پیشنهاد</span>
        </div>
        {bids.length === 0 ? (
          <p className="text-sm text-muted-foreground p-3 rounded-xl bg-gray-50">هنوز پیشنهادی ثبت نشده است.</p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {bids.map((bid) => (
              <div key={bid.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="text-sm font-bold">{bid.bidderName}</p>
                  <p className="text-xs text-muted-foreground">{new Date(bid.createdAt).toLocaleString('fa-IR')}</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-gold-600">{formatPrice(bid.amount)} تومان</p>
                  {bid.isWinning && <p className="text-xs text-green-700">پیشنهاد برتر</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {auction.status === 'active' || auction.status === 'extended' ? (
        <div className="mb-5">
          <label className="text-xs text-muted-foreground mb-1 block">مبلغ پیشنهاد جدید</label>
          <div className="flex gap-2">
            <input
              type="number"
              value={bidAmount}
              onChange={(event) => onBidAmountChange(event.target.value)}
              className="input"
              placeholder={minimumBid.toString()}
            />
            <button
              disabled={isBidding || Number(bidAmount) < minimumBid}
              onClick={onPlaceBid}
              className="btn btn-primary whitespace-nowrap gap-2"
            >
              <TrendingUp className="h-5 w-5" />
              ثبت پیشنهاد
            </button>
          </div>
          {bidAmount && Number(bidAmount) < minimumBid && (
            <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              مبلغ باید حداقل {formatPrice(minimumBid)} تومان باشد
            </p>
          )}
        </div>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-xs text-red-700">{error}</p> : null}

      {auction.status === 'ended' && auction.winningBidderId && (
        <button
          disabled={isSettling || auction.paymentStatus === 'paid'}
          onClick={onSettle}
          className="btn btn-primary w-full gap-2"
        >
          <CheckCircle2 className="h-5 w-5" />
          {auction.paymentStatus === 'paid' ? 'تسویه انجام شده' : 'ثبت پرداخت برنده'}
        </button>
      )}

      {auction.status === 'scheduled' && (
        <button
          disabled={isCancelling}
          onClick={onCancel}
          className="btn btn-outline w-full gap-2 text-red-600 hover:text-red-700"
        >
          <XCircle className="h-5 w-5" />
          لغو مزایده
        </button>
      )}

      {auction.status === 'active' && (
        <button
          disabled={isCancelling}
          onClick={onCancel}
          className="btn btn-outline w-full gap-2 text-red-600 hover:text-red-700"
        >
          <XCircle className="h-5 w-5" />
          لغو مزایده فعال
        </button>
      )}
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-gray-50">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-bold text-navy-900">{value}</span>
    </div>
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-gray-50">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className="font-bold text-sm text-navy-900">{value}</p>
    </div>
  )
}

function EmptyAuctionState() {
  return (
    <div className="text-center py-20 card">
      <Gavel className="h-12 w-12 mx-auto mb-4 text-gold-600" />
      <h3 className="text-xl font-bold mb-2">مزایده‌ای پیدا نشد</h3>
      <p className="text-muted-foreground">اولین مزایده طلا را تعریف کنید یا فیلترها را تغییر دهید.</p>
    </div>
  )
}

function EmptyAuctionDetailState() {
  return (
    <div className="card p-8 text-center">
      <User className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
      <h3 className="text-xl font-bold mb-2">یک مزایده انتخاب کنید</h3>
      <p className="text-muted-foreground">برای مشاهده جزئیات، ثبت پیشنهاد یا تسویه، یکی از مزایده‌ها را انتخاب کنید.</p>
    </div>
  )
}

function getAuctionCountdown(auction: Auction) {
  const now = Date.now()
  const target = auction.status === 'scheduled' ? new Date(auction.startsAt).getTime() : new Date(auction.endsAt).getTime()
  const diff = target - now

  if (diff <= 0) return 'اکنون'

  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)

  if (days > 0) return `${days} روز و ${hours} ساعت`
  if (hours > 0) return `${hours} ساعت و ${minutes} دقیقه`
  return `${minutes} دقیقه`
}
