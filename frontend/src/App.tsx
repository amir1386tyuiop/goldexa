import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { Navbar } from './components/Navbar'
import { CartDrawer } from './components/CartDrawer'
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

function AppShell() {
  const location = useLocation()
  const isAuthenticated = Boolean(localStorage.getItem('goldeksa_auth'))

  return (
    <>
      {isAuthenticated && !['/', '/login'].includes(location.pathname) && <Navbar />}
      <CartDrawer />
    </>
  )
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background font-vazir">
        <AppShell />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/shop" element={<ShopPage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/ar" element={<ARPage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/marketplace" element={<AuctionsPage initialTab="marketplace" />} />
          <Route path="/builder" element={<BuilderPage />} />
          <Route path="/ai-engine" element={<AdminOnlyAiEnginePage />} />
          <Route path="/pricing" element={<PricingPage />} />
          <Route path="/wallet" element={<WalletPage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route path="/escrow" element={<EscrowPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
