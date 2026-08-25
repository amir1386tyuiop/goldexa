import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ArrowUpRight, Brain, LineChart, RefreshCw, Sparkles, Users } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { AiDesignRecommendation, AiMarketMatch, AiPricePrediction, AiServiceMetric } from '@/types'
import { Navigate } from 'react-router-dom'
import { getStoredAuth } from '@/auth'

export function AiEnginePage() {
  return (
    <div className="pt-20 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-navy-900">موتور هوش مصنوعی</h1>
          <p className="text-muted-foreground mt-2">پیش‌بینی قیمت، توصیه طراحی، تطابق خریدار و فروشنده و شاخص‌های مدل</p>
        </div>
        <AiEnginePanel />
      </div>
    </div>
  )
}

export function AdminOnlyAiEnginePage() {
  const raw = localStorage.getItem('goldeksa_auth')
  const auth = raw ? (JSON.parse(raw) as { user?: { role?: string } } | null) : null

  if (auth?.user?.role === 'admin') {
    return <AiEnginePage />
  }

  return <Navigate to="/login" replace />
}

export function AiEnginePanel({ insidePage = true }: { insidePage?: boolean }) {
  const userId = getStoredAuth()?.user.id || ''
  const queryClient = useQueryClient()

  const invalidateAi = (keys: string[][]) => {
    keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }))
  }

  const rerunPredictions = useMutation({
    mutationFn: () => api.rerunAiPredictions(userId),
    onSuccess: () => invalidateAi([['ai-predictions']]),
  })

  const rerunRecommendations = useMutation({
    mutationFn: () => api.rerunAiRecommendations(userId),
    onSuccess: () => invalidateAi([['ai-recommendations']]),
  })

  const rerunMatches = useMutation({
    mutationFn: () => api.rerunAiMatches(),
    onSuccess: () => invalidateAi([['ai-matches']]),
  })

  const rerunMetrics = useMutation({
    mutationFn: () => api.rerunAiMetrics(),
    onSuccess: () => invalidateAi([['ai-metrics']]),
  })

  const rerunAll = useMutation({
    mutationFn: () => api.rerunAiAll(userId),
    onSuccess: () => invalidateAi([['ai-predictions'], ['ai-recommendations'], ['ai-matches'], ['ai-metrics']]),
  })

  const { data: predictions = [] } = useQuery<AiPricePrediction[]>({
    queryKey: ['ai-predictions', userId],
    queryFn: () => api.getAiPredictions(userId),
    initialData: [],
    enabled: Boolean(userId),
  })

  const { data: recommendations = [] } = useQuery<AiDesignRecommendation[]>({
    queryKey: ['ai-recommendations', userId],
    queryFn: () => api.getAiRecommendations(userId),
    initialData: [],
    enabled: Boolean(userId),
  })

  const { data: matches = [] } = useQuery<AiMarketMatch[]>({
    queryKey: ['ai-matches'],
    queryFn: api.getAiMatches,
    initialData: [],
  })

  const { data: metrics = [] } = useQuery<AiServiceMetric[]>({
    queryKey: ['ai-metrics'],
    queryFn: api.getAiMetrics,
    initialData: [],
  })

  return (
    <div className={insidePage ? 'pt-20 pb-16' : ''}>
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h1 className="text-3xl font-black text-navy-900">موتور هوش مصنوعی</h1>
              <p className="text-muted-foreground mt-2">پیش‌بینی قیمت، توصیه طراحی، تطابق خریدار و فروشنده و شاخص‌های مدل</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <ActionButton label="اجرای همه" isPending={rerunAll.isPending} isSuccess={rerunAll.isSuccess} onRun={() => rerunAll.mutate(undefined)} />
              <ActionButton label="پیش‌بینی" isPending={rerunPredictions.isPending} isSuccess={rerunPredictions.isSuccess} onRun={() => rerunPredictions.mutate(undefined)} />
              <ActionButton label="طراحی" isPending={rerunRecommendations.isPending} isSuccess={rerunRecommendations.isSuccess} onRun={() => rerunRecommendations.mutate(undefined)} />
              <ActionButton label="تطابق" isPending={rerunMatches.isPending} isSuccess={rerunMatches.isSuccess} onRun={() => rerunMatches.mutate(undefined)} />
              <ActionButton label="شاخص‌ها" isPending={rerunMetrics.isPending} isSuccess={rerunMetrics.isSuccess} onRun={() => rerunMetrics.mutate(undefined)} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AiSection title="پیش‌بینی قیمت طلا" icon={<LineChart className="h-5 w-5 text-gold-600" />}>
            {predictions.length === 0 ? (
              <EmptyState title="پیش‌بینی ثبت نشده" description="پیش‌بینی‌های قیمت طلا اینجا نمایش داده می‌شوند." />
            ) : (
              predictions.map((prediction) => (
                <AiCard key={prediction.id} label={prediction.modelVersion} value={formatPrice(prediction.predictedPrice)} detail={`${prediction.confidenceScore}% اطمینان برای ${prediction.horizonDays} روز آینده`} />
              ))
            )}
          </AiSection>

          <AiSection title="توصیه طراحی" icon={<Sparkles className="h-5 w-5 text-gold-600" />}>
            {recommendations.length === 0 ? (
              <EmptyState title="توصیه‌ای ثبت نشده" description="بر اساس رفتار کاربر، طرح‌های پیشنهادی اینجا نمایش داده می‌شوند." />
            ) : (
              recommendations.map((item) => (
                <AiCard key={item.id} label={item.source} value={`${item.score} از ۱۰۰`} detail={item.reason} />
              ))
            )}
          </AiSection>

          <AiSection title="تطابق بازار" icon={<Users className="h-5 w-5 text-gold-600" />}>
            {matches.length === 0 ? (
              <EmptyState title="تطابقی ثبت نشده" description="تطابق‌های هوشمند خریدار و فروشنده اینجا نمایش داده می‌شوند." />
            ) : (
              matches.map((item) => (
                <AiCard key={item.id} label={item.status} value={`${item.score} از ۱۰۰`} detail={`${item.buyerId} با ${item.sellerId}`} />
              ))
            )}
          </AiSection>

          <AiSection title="شاخص‌های سرویس" icon={<Brain className="h-5 w-5 text-gold-600" />}>
            {metrics.length === 0 ? (
              <EmptyState title="شاخصی ثبت نشده" description="مقادیر عملکرد مدل‌های هوش مصنوعی اینجا نمایش داده می‌شوند." />
            ) : (
              metrics.map((item) => (
                <AiCard key={item.id} label={item.name} value={String(item.value)} detail={JSON.stringify(item.metadata)} />
              ))
            )}
          </AiSection>
        </div>
      </div>
    </div>
  )
}

function AiSection({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="card p-6">
      <div className="flex items-center gap-3">
        {icon}
        <h2 className="text-xl font-black text-navy-900">{title}</h2>
      </div>
      <div className="mt-5 space-y-3">{children}</div>
    </section>
  )
}

function ActionButton({ onRun, isPending, isSuccess, label }: { onRun: () => void; isPending: boolean; isSuccess: boolean; label: string }) {
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={onRun}
      className="inline-flex items-center gap-2 rounded-xl border border-gold-500/20 bg-gold-50 px-3 py-2 text-xs font-black text-navy-900 hover:bg-gold-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'در حال اجرا...' : isSuccess ? `${label} انجام شد` : label}
      <ArrowUpRight className="h-3.5 w-3.5" />
    </button>
  )
}

function AiCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-xl bg-gold-50 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-muted-foreground">{label}</p>
          <p className="text-xs text-muted-foreground mt-1">{detail}</p>
        </div>
        <strong className="text-navy-900">{value}</strong>
      </div>
    </div>
  )
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center">
      <h3 className="font-bold text-navy-900">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
    </div>
  )
}
