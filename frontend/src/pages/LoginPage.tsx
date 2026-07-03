import { FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '@/api/client'
import type { UserRole } from '@/types'
import { Lock, Smartphone, ShieldCheck, UserCheck } from 'lucide-react'

const testRoles: { label: string; role: UserRole; phone: string; description: string }[] = [
  { label: 'خریدار تستی', role: 'buyer', phone: '09120000001', description: 'داشبورد خرید و صندوقچه' },
  { label: 'فروشنده تستی', role: 'seller', phone: '09120000002', description: 'داشبورد محصولات و سفارش‌ها' },
  { label: 'طراح تستی', role: 'designer', phone: '09120000003', description: 'داشبورد طراحی اختصاصی' },
  { label: 'ادمین تستی', role: 'admin', phone: '09120000000', description: 'داشبورد مدیریت پلتفرم' },
  { label: 'کارشناس تستی', role: 'expert', phone: '09120000004', description: 'داشبورد بررسی و تایید' },
  { label: 'کاربر ویژه تستی', role: 'premium', phone: '09120000005', description: 'داشبورد امکانات ویژه' },
  { label: 'رهبر خرید گروهی', role: 'group_buyer', phone: '09120000006', description: 'داشبورد خرید گروهی' },
]

export function LoginPage() {
  const navigate = useNavigate()
  const [role, setRole] = useState<UserRole>('buyer')
  const [phone, setPhone] = useState(testRoles[0]?.phone || '')
  const [otp, setOtp] = useState('')
  const [generatedOtp, setGeneratedOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedRole = testRoles.find((item) => item.role === role)

  useEffect(() => {
    const matched = testRoles.find((item) => item.role === role)
    if (matched) {
      setPhone(matched.phone)
    }
  }, [role])

  async function handleRequestOtp(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.requestOtp(phone, role)
      setGeneratedOtp(response.otp)
    } catch (error) {
      setError((error as { message?: string })?.message || 'درخواست OTP با خطا مواجه شد.')
    } finally {
      setLoading(false)
    }
  }

  async function handleLogin(event: FormEvent) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await api.loginWithOtp(phone, otp, role)
      localStorage.setItem('goldeksa_auth', JSON.stringify(response))
      navigate(role === 'admin' ? '/admin' : '/dashboard')
    } catch (error) {
      setError((error as { message?: string })?.message || 'کد OTP یا نقش انتخاب‌شده معتبر نیست.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-950 via-navy-900 to-gold-700 pt-24 pb-12">
      <div className="container mx-auto px-4">
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="text-white">
            <div className="mb-6 flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-gold-300" />
              <div>
                <p className="text-sm text-gold-200">Goldexa Secure Access</p>
                <h1 className="text-3xl font-black">ورود امن با OTP</h1>
              </div>
            </div>
            <p className="text-lg leading-9 text-white/80">
              برای محیط لوکال، کد OTP بعد از زدن دکمه «درخواست OTP» همین‌جا نمایش داده می‌شود. هر شماره تست فقط اجازه ورود به داشبورد نقش خودش را دارد.
            </p>
            <div className="mt-8 grid gap-4">
              {testRoles.map((item) => (
                <button
                  key={item.role}
                  onClick={() => setRole(item.role)}
                  className={`rounded-2xl border p-4 text-right transition ${
                    role === item.role ? 'border-gold-300 bg-white/10' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <p className="font-bold text-white">{item.label}</p>
                  <p className="mt-1 text-sm text-white/70">{item.phone}</p>
                  <p className="mt-1 text-xs text-white/50">{item.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="card p-6 lg:p-8">
            <div className="mb-6 flex items-center gap-3">
              <Lock className="h-8 w-8 text-gold-600" />
              <div>
                <h2 className="text-2xl font-black">ورود به سامانه</h2>
                <p className="text-sm text-muted-foreground">نقش و شماره تستی انتخاب‌شده</p>
              </div>
            </div>

            <form onSubmit={handleRequestOtp} className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">نقش مورد نظر</span>
                <select
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                  className="input"
                >
                  {testRoles.map((item) => (
                    <option key={item.role} value={item.role}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium">شماره موبایل</span>
                <div className="relative">
                  <Smartphone className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    className="input pr-10"
                    inputMode="tel"
                  />
                </div>
              </label>

              <button disabled={loading} className="btn btn-primary w-full">
                درخواست OTP
              </button>
            </form>

            {generatedOtp && (
              <div className="mt-5 rounded-2xl border border-gold-200 bg-gold-50 p-4">
                <p className="text-sm text-muted-foreground">کد OTP تولیدشده برای {phone}</p>
                <p className="mt-2 text-center text-4xl font-black tracking-[0.8em] text-navy-950">{generatedOtp}</p>
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium">کد OTP</span>
                <div className="relative">
                  <UserCheck className="absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    value={otp}
                    onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                    className="input pr-10 text-center tracking-[0.5em] font-black"
                    inputMode="numeric"
                    maxLength={6}
                  />
                </div>
              </label>

              <button disabled={loading || !otp} className="btn btn-primary w-full">
                ورود به سامانه
              </button>
            </form>

            {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}

            {selectedRole && (
              <div className="mt-6 rounded-2xl bg-navy-50 p-4 text-sm text-muted-foreground">
                <p>
                  <span className="font-bold text-navy-900">{selectedRole.label} تستی:</span> {selectedRole.phone}
                </p>
                <p className="mt-1">نقش انتخاب‌شده با شماره موبایل تطبیق داده می‌شود و فقط همان داشبورد باز می‌شود.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
