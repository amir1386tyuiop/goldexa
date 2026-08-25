import type { ReactNode } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { CartDrawer } from './components/CartDrawer'
import { Footer } from './components/Footer'
import { Toast } from './components/Toast'
import { ShopPage } from './pages/ShopPage'
import { ProductDetailPage } from './pages/ProductDetailPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { ARPage } from './pages/ARPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { AuctionsPage } from './pages/AuctionsPage'
import { BuilderPage } from './pages/BuilderPage'
import { AdminOnlyAiEnginePage } from './pages/AiEnginePage'
import { EscrowPage } from './pages/EscrowPage'
import { PricingPage } from './pages/PricingPage'
import { WalletPage } from './pages/WalletPage'
import { OrdersPage } from './pages/OrdersPage'
import { AdminPage } from './pages/AdminPage'
import { LandingPage } from './pages/LandingPage'
import { HomePage } from './pages/HomePage'
import { getStoredAuth, hasRole } from './auth'

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
            <Route path="/ai-engine" element={<RequireAdmin><AdminOnlyAiEnginePage /></RequireAdmin>} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/wallet" element={<RequireAuth><WalletPage /></RequireAuth>} />
            <Route path="/orders" element={<RequireAuth><OrdersPage /></RequireAuth>} />
            <Route path="/escrow" element={<RequireAuth><EscrowPage /></RequireAuth>} />
            <Route path="/admin" element={<RequireAdmin><AdminPage /></RequireAdmin>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
          </Routes>
        </AppShell>
      </div>
    </Router>
  )
}

export default App
