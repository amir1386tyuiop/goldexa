import type { ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { CartDrawer } from './components/CartDrawer'
import { Footer } from './components/Footer'
import { Toast } from './components/Toast'
import { LandingPage } from './pages/LandingPage'
import { lazy, Suspense } from 'react'
import { getStoredAuth, hasRole } from './auth'
import { NotFoundPage } from './pages/NotFoundPage'

const ShopPage = lazy(() => import('./pages/ShopPage').then(({ ShopPage }) => ({ default: ShopPage })))
const ProductDetailPage = lazy(() => import('./pages/ProductDetailPage').then(({ ProductDetailPage }) => ({ default: ProductDetailPage })))
const CheckoutPage = lazy(() => import('./pages/CheckoutPage').then(({ CheckoutPage }) => ({ default: CheckoutPage })))
const ARPage = lazy(() => import('./pages/ARPage').then(({ ARPage }) => ({ default: ARPage })))
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(({ DashboardPage }) => ({ default: DashboardPage })))
const LoginPage = lazy(() => import('./pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })))
const AuctionsPage = lazy(() => import('./pages/AuctionsPage').then(({ AuctionsPage }) => ({ default: AuctionsPage })))
const BuilderPage = lazy(() => import('./pages/BuilderPage').then(({ BuilderPage }) => ({ default: BuilderPage })))
const AdminOnlyAiEnginePage = lazy(() => import('./pages/AiEnginePage').then(({ AdminOnlyAiEnginePage }) => ({ default: AdminOnlyAiEnginePage })))
const EscrowPage = lazy(() => import('./pages/EscrowPage').then(({ EscrowPage }) => ({ default: EscrowPage })))
const PricingPage = lazy(() => import('./pages/PricingPage').then(({ PricingPage }) => ({ default: PricingPage })))
const WalletPage = lazy(() => import('./pages/WalletPage').then(({ WalletPage }) => ({ default: WalletPage })))
const OrdersPage = lazy(() => import('./pages/OrdersPage').then(({ OrdersPage }) => ({ default: OrdersPage })))
const GroupBuyingPage = lazy(() => import('./pages/GroupBuyingPage').then(({ GroupBuyingPage }) => ({ default: GroupBuyingPage })))
const AdminPage = lazy(() => import('./pages/AdminPage').then(({ AdminPage }) => ({ default: AdminPage })))
const HomePage = lazy(() => import('./pages/HomePage').then(({ HomePage }) => ({ default: HomePage })))

const PUBLIC_MINIMAL_LAYOUT = ['/', '/login']

function AppShell({ children }: { children: ReactNode }) {
  const location = useLocation()
  const showChrome = !PUBLIC_MINIMAL_LAYOUT.includes(location.pathname)

  return (
    <div className="flex min-h-screen flex-col">
      {showChrome && <Navbar />}
      <CartDrawer />
      <Toast />
      <main className="flex-1">{children}</main>
      {showChrome && <Footer />}
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const location = useLocation()

  if (!getStoredAuth()) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}

function RequireAdmin({ children }: { children: ReactNode }) {
  if (!getStoredAuth()) {
    return <Navigate to="/login" replace />
  }

  if (!hasRole('admin')) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-vazir">
        <AppShell>
          <Suspense fallback={<div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">در حال بارگذاری…</div>}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/shop" element={<ShopPage />} />
            <Route path="/product/:id" element={<ProductDetailPage />} />
            <Route path="/checkout" element={<RequireAuth><CheckoutPage /></RequireAuth>} />
            <Route path="/ar" element={<ARPage />} />
            <Route path="/auctions" element={<AuctionsPage />} />
            <Route path="/marketplace" element={<AuctionsPage initialTab="marketplace" />} />
            <Route path="/builder" element={<BuilderPage />} />
            <Route path="/ai-workspace" element={<RequireAdmin><AdminOnlyAiEnginePage /></RequireAdmin>} />
            <Route path="/ai-engine" element={<Navigate to="/ai-workspace" replace />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
            <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
            <Route path="/group-buying" element={<RequireAuth><GroupBuyingPage /></RequireAuth>} />
            <Route path="/escrow" element={<RequireAuth><EscrowPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
          </Suspense>
        </AppShell>
      </div>
    </Router>
  )
}

export default App
