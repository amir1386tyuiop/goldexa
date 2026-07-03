import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowDownUp, Coins, CreditCard, History, ShieldCheck } from 'lucide-react'
import { api } from '@/api/client'
import { formatPrice } from '@/utils/helpers'
import type { WalletTransaction } from '@/types'

function getAuthenticatedUser() {
  try {
    return JSON.parse(localStorage.getItem('goldeksa_auth') || 'null') as { user?: { id?: string } } | null
  } catch {
    return null
  }
}

export function WalletPage() {
  const userId = getAuthenticatedUser()?.user?.id || '11111111-1111-1111-1111-111111111111'
  const [activeTab, setActiveTab] = useState<'summary' | 'transactions'>('summary')
  const { data: wallet } = useQuery({
    queryKey: ['wallet', userId],
    queryFn: () => api.getWallet(userId),
    refetchInterval: 30000,
  })
  const { data: transactions = [] } = useQuery({
    queryKey: ['wallet-transactions', userId],
    queryFn: () => api.getWalletTransactions(userId),
  })

  const goldBalance = wallet?.goldBalanceGrams ?? 0
  const balance = wallet?.balance ?? 0
  const latestTransactions = useMemo(() => transactions.slice(0, 8), [transactions])

  return (
    <div className="pt-24 pb-16">
      <div className="container mx-auto px-4">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm text-gold-600 font-bold mb-2">کیف پول دیجیتال طلا</p>
            <h1 className="text-3xl font-black text-navy-900">مدیریت دارایی</h1>
            <p className="text-muted-foreground mt-2">موجودی ریالی، طلای دیجیتال و تاریخچه تراکنش‌های مالی در یک نمای امن.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveTab('summary')} className={activeTab === 'summary' ? 'btn btn-primary' : 'btn btn-outline'}>خلاصه</button>
            <button onClick={() => setActiveTab('transactions')} className={activeTab === 'transactions' ? 'btn btn-primary' : 'btn btn-outline'}>تراکنش‌ها</button>
          </div>
        </div>

        {activeTab === 'summary' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center"><CreditCard className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">موجودی ریالی</p>
                    <p className="text-2xl font-black text-navy-900 mt-1">{formatPrice(balance)} تومان</p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center"><Coins className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">موجودی طلای دیجیتال</p>
                    <p className="text-2xl font-black text-navy-900 mt-1">{goldBalance} گرم</p>
                  </div>
                </div>
              </div>
              <div className="card p-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gold-50 text-gold-600 flex items-center justify-center"><ArrowDownUp className="h-6 w-6" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">تراکنش‌ها</p>
                    <p className="text-2xl font-black text-navy-900 mt-1">{transactions.length} مورد</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <div className="card p-6 lg:col-span-2">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-xl font-black text-navy-900">آخرین تراکنش‌ها</h2>
                  <History className="h-5 w-5 text-gold-600" />
                </div>
                <div className="space-y-3">
                  {latestTransactions.length ? latestTransactions.map((transaction) => (
                    <WalletTransactionRow key={transaction.id} transaction={transaction} />
                  )) : (
                    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">تراکنشی ثبت نشده است</div>
                  )}
                </div>
              </div>

              <div className="card p-6">
                <h2 className="text-xl font-black text-navy-900 mb-4">امنیت مالی</h2>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <div className="rounded-2xl bg-gray-50 p-4"><ShieldCheck className="h-5 w-5 text-gold-600 mb-2" /><p>تمام تغییرات کیف پول با تراکنش ثبت می‌شود.</p></div>
                  <div className="rounded-2xl bg-gray-50 p-4"><ShieldCheck className="h-5 w-5 text-gold-600 mb-2" /><p>فروش بیشتر از موجودی طلای دیجیتال مجاز نیست.</p></div>
                  <div className="rounded-2xl bg-gray-50 p-4"><ShieldCheck className="h-5 w-5 text-gold-600 mb-2" /><p>خرید و فروش با سفارش و پرداخت قابل ردیابی است.</p></div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'transactions' && (
          <div className="card p-6">
            <h2 className="text-xl font-black text-navy-900 mb-5">تاریخچه کامل تراکنش‌ها</h2>
            <div className="space-y-3">
              {transactions.length ? transactions.map((transaction) => (
                <WalletTransactionRow key={transaction.id} transaction={transaction} />
              )) : (
                <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">تراکنشی ثبت نشده است</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function WalletTransactionRow({ transaction }: { transaction: WalletTransaction }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-border p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${transaction.amount >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          <ArrowDownUp className="h-5 w-5" />
        </div>
        <div>
          <p className="font-bold text-navy-900">{transaction.type || 'wallet'}</p>
          <p className="text-xs text-muted-foreground">{transaction.description || 'تراکنش کیف پول'}</p>
        </div>
      </div>
      <div className="text-left">
        <p className={`font-black ${transaction.amount >= 0 ? 'text-green-700' : 'text-red-700'}`}>{transaction.amount} گرم</p>
        <p className="text-xs text-muted-foreground">{transaction.createdAt}</p>
      </div>
    </div>
  )
}
