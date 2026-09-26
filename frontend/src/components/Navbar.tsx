import { useState } from 'react'
import { Activity, Bot, Gem, LogOut, Menu, PackageCheck, ShieldCheck, ShoppingBag, ShoppingCart, TrendingUp, User, Users, Wallet, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { cn } from '@/lib/utils'
import { clearStoredAuth, getStoredAuth } from '@/auth'

const navItems = [
  { label: 'خانه', path: '/home', icon: Gem },
  { label: 'فروشگاه', path: '/shop', icon: ShoppingBag },
  { label: 'قیمت طلا', path: '/pricing', icon: TrendingUp },
  { label: 'مزایده', path: '/auctions', icon: Activity },
  { label: 'جامعه طراحی', path: '/community', icon: Users },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const cartCount = useStore((state) => state.getCartCount())
  const isCartOpen = useStore((state) => state.isCartOpen)
  const toggleCart = useStore((state) => state.toggleCart)
  const currentUser = getStoredAuth()?.user
  const accountPath = currentUser?.role === 'admin' ? '/admin' : '/dashboard'

  function closeMenu() { setMenuOpen(false) }
  function handleLogout() { clearStoredAuth(); closeMenu(); navigate('/') }

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-stone-200/80 bg-[#faf9f6]/90 backdrop-blur-xl">
      <div className="page-shell flex h-[76px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button aria-label={menuOpen ? 'بستن منو' : 'باز کردن منو'} className="rounded-xl p-3 hover:bg-amber-50 lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <Link to="/home" className="flex items-center gap-3" onClick={closeMenu}>
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-950 text-amber-300 shadow-lg"><Gem className="h-5 w-5" /></span>
            <span><strong className="block text-lg font-black tracking-tight text-stone-950">گلدکسا</strong><small className="-mt-0.5 block text-[10px] font-medium text-amber-700">ثروت، با اطمینان</small></span>
          </Link>
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="ناوبری اصلی">
          {navItems.map(({ label, path, icon: Icon }) => (
            <Link key={path} to={path} className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-amber-50 hover:text-stone-950', location.pathname === path ? 'bg-stone-950 text-white hover:bg-stone-800 hover:text-white' : 'text-stone-600')}>
              <Icon className="h-4 w-4" />{label}
            </Link>
          ))}
          {currentUser && currentUser.role !== 'admin' && <Link to="/ai-workspace" className={cn('flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors hover:bg-amber-50', location.pathname === '/ai-workspace' ? 'bg-stone-950 text-white hover:bg-stone-800' : 'text-amber-900')}><Bot className="h-4 w-4" />طراح هوشمند</Link>}
          {currentUser?.role === 'admin' && <Link to="/admin" className="rounded-xl bg-amber-100 px-3 py-2 text-sm font-semibold text-amber-900">مدیریت</Link>}
        </nav>

        <div className="flex items-center gap-2">
          <button aria-label="باز کردن سبد خرید" onClick={toggleCart} className={cn('relative rounded-xl p-3 transition-colors hover:bg-amber-50', isCartOpen && 'bg-amber-50 text-amber-800')}>
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && <span className="absolute -left-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-700 px-1 text-xs font-bold text-white">{cartCount}</span>}
          </button>
          {currentUser ? <>
            <Link to={accountPath} className="hidden items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 sm:flex"><User className="h-4 w-4" />{currentUser.role === 'admin' ? 'پنل مدیریت' : 'حساب من'}</Link>
            <button aria-label="خروج از حساب" onClick={handleLogout} className="hidden rounded-xl p-3 text-stone-500 hover:bg-red-50 hover:text-red-700 sm:block"><LogOut className="h-4 w-4" /></button>
          </> : <Link to="/login" className="hidden items-center gap-2 rounded-xl bg-stone-950 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 sm:flex"><User className="h-4 w-4" />ورود</Link>}
        </div>
      </div>

      {menuOpen && <div className="border-t border-stone-200 bg-[#faf9f6] px-4 py-4 shadow-xl lg:hidden">
        <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="منوی موبایل">
          {navItems.map(({ label, path, icon: Icon }) => <Link key={path} to={path} onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-medium hover:bg-amber-50"><Icon className="h-5 w-5 text-amber-700" />{label}</Link>)}
          <Link to="/dashboard" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-medium hover:bg-amber-50"><PackageCheck className="h-5 w-5 text-amber-700" />داشبورد و سفارش‌ها</Link>
          {currentUser && currentUser.role !== 'admin' && <Link to="/ai-workspace" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-900 hover:bg-amber-100"><Bot className="h-5 w-5 text-amber-700" />طراح هوشمند جواهر</Link>}
          {currentUser?.role === 'admin' && <Link to="/admin" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-900 hover:bg-amber-100"><ShieldCheck className="h-5 w-5 text-amber-700" />پنل مدیریت</Link>}
          {currentUser?.role === 'admin' && <Link to="/ai-workspace" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-semibold text-amber-900 hover:bg-amber-100"><Bot className="h-5 w-5 text-amber-700" />مرکز هوش مصنوعی</Link>}
          <Link to="/wallet" onClick={closeMenu} className="flex min-h-12 items-center gap-3 rounded-xl px-4 py-3 font-medium hover:bg-amber-50"><Wallet className="h-5 w-5 text-amber-700" />کیف پول</Link>
          {!currentUser && <Link to="/login" onClick={closeMenu} className="mt-2 flex min-h-12 items-center justify-center rounded-xl bg-stone-950 px-4 py-3 font-semibold text-white">ورود / ثبت‌نام</Link>}
        </nav>
      </div>}
    </header>
  )
}
