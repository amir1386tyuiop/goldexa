import { useState } from 'react'
import { ShoppingCart, User, Menu, X, Gavel, Wand2, ShieldCheck, LogOut, Wallet, Activity, PackageCheck, Home, ShoppingBag, Blocks, Gem, TrendingUp } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '@/store/store'
import { cn } from '@/lib/utils'
import { clearStoredAuth, getStoredAuth } from '@/auth'

const navItems = [
  { label: 'صفحه اصلی', path: '/home', icon: <Home className="h-4 w-4" /> },
  { label: 'داشبورد', path: '/dashboard', icon: <Activity className="h-4 w-4" /> },
  { label: 'قیمت لحظه‌ای', path: '/pricing', icon: <TrendingUp className="h-4 w-4" /> },
  { label: 'سفارشات', path: '/orders', icon: <PackageCheck className="h-4 w-4" /> },
  { label: 'کیف پول', path: '/wallet', icon: <Wallet className="h-4 w-4" /> },
  { label: 'فروشگاه', path: '/shop', icon: <ShoppingBag className="h-4 w-4" /> },
  { label: 'مزایده', path: '/auctions', icon: <Gavel className="h-4 w-4" /> },
  { label: 'طراحی اختصاصی', path: '/builder', icon: <Wand2 className="h-4 w-4" /> },
  { label: 'پرداخت امن', path: '/escrow', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'پرو مجازی', path: '/ar', icon: <Blocks className="h-4 w-4" /> },
  { label: 'بازار دست دوم', path: '/marketplace', icon: <Gem className="h-4 w-4" /> },
]

const adminNavItems = [
  { label: 'پنل مدیریت', path: '/admin', icon: <ShieldCheck className="h-4 w-4" /> },
]

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const cartCount = useStore((state) => state.getCartCount())
  const isCartOpen = useStore((state) => state.isCartOpen)
  const toggleCart = useStore((state) => state.toggleCart)
  const currentUser = getStoredAuth()?.user

  function handleLogout() {
    clearStoredAuth()
    navigate('/')
  }

  return (
    <header className="fixed top-0 right-0 left-0 z-50 h-16 border-b border-border bg-white/90 backdrop-blur-xl">
      <div className="container mx-auto flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <button className="lg:hidden" onClick={() => setMenuOpen((value) => !value)}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
          <Link to="/home" className="flex items-center gap-2 cursor-pointer">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 text-white font-bold text-xl">
              ◆
            </div>
            <div>
              <h1 className="text-xl font-bold text-navy-900">گلدکسا</h1>
              <p className="text-xs text-gold-600 -mt-1">پلتفرم جامع طلا</p>
            </div>
          </Link>
        </div>

        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg hover:bg-gold-50 hover:text-gold-700 transition-all"
            >
              {item.icon && <span className="ml-2 inline-flex">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
          {currentUser?.role === 'admin' && adminNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gold-700 rounded-lg bg-gold-50 hover:bg-gold-100 transition-all"
            >
              {item.icon && <span className="ml-2 inline-flex">{item.icon}</span>}
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              toggleCart()
              setMenuOpen(false)
            }}
            className={cn(
              'relative p-2 rounded-xl hover:bg-gold-50 transition-all',
              isCartOpen && 'bg-gold-50 text-gold-700'
            )}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white font-bold">
                {cartCount}
              </span>
            )}
          </button>
          {currentUser ? (
            <>
              <button
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl border border-border text-sm font-medium hover:bg-gold-50 transition-all"
              >
                <LogOut className="h-4 w-4" />
                خروج
              </button>
              <Link
              to="/dashboard"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-all"
              >
                <User className="h-4 w-4" />
                <span className="max-w-[120px] truncate">{currentUser.name || 'داشبورد'}</span>
              </Link>
            </>
          ) : (
            <Link
              to="/dashboard"
              className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-navy-900 text-white text-sm font-medium hover:bg-navy-800 transition-all"
            >
              <User className="h-4 w-4" />
              ورود / ثبت‌نام
            </Link>
          )}
        </div>
      </div>

      {menuOpen && (
        <div className="lg:hidden border-t border-border bg-white px-4 py-3 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-muted-foreground hover:bg-gold-50 hover:text-gold-700 transition-all"
            >
              {item.label}
            </Link>
          ))}
          {currentUser?.role === 'admin' && adminNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setMenuOpen(false)}
              className="block px-4 py-3 rounded-xl text-sm font-medium text-gold-700 bg-gold-50 hover:bg-gold-100 transition-all"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  )
}
