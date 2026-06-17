import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import Header from './components/Header';
import HomePage from './pages/HomePage';
import CatalogPage from './pages/CatalogPage';
import ProductDetailPage from './pages/ProductDetailPage';
import CartPage from './pages/CartPage';
import AdminPage from './pages/AdminPage';
import AuthPage from './pages/AuthPage';
import OrdersPage from './pages/OrdersPage';
import SellPage from './pages/SellPage';
import CheckoutPage from './pages/CheckoutPage';
import AboutPage from './pages/AboutPage';
import FAQPage from './pages/FAQPage';
import ShippingReturnsPage from './pages/ShippingReturnsPage';
import ContactPage from './pages/ContactPage';
import MaintenancePage from './pages/MaintenancePage';
import AccountPage from './pages/AccountPage';
import PromoModal from './components/PromoModal';
import { supabase } from './lib/supabase';
import { AlertTriangle } from 'lucide-react';

interface MaintenanceState {
  enabled: boolean;
  title: string;
  message: string;
  bgImageUrl: string;
}

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [productId, setProductId] = useState<string | null>(null);
  const [catalogType, setCatalogType] = useState<string>('');
  const { isAdmin, loading, user } = useAuth();

  const [maintenance, setMaintenance] = useState<MaintenanceState>({
    enabled: false,
    title: "We'll Be Right Back",
    message: "We're performing scheduled maintenance and will be back shortly.",
    bgImageUrl: '',
  });
  const [maintenanceLoading, setMaintenanceLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('modal_config')
      .select('maintenance_enabled, maintenance_title, maintenance_message, maintenance_bg_image_url')
      .eq('id', 1)
      .single()
      .then(({ data }) => {
        if (data) {
          setMaintenance({
            enabled: data.maintenance_enabled ?? false,
            title: data.maintenance_title ?? "We'll Be Right Back",
            message: data.maintenance_message ?? '',
            bgImageUrl: data.maintenance_bg_image_url ?? '',
          });
        }
        setMaintenanceLoading(false);
      })
      .catch(() => setMaintenanceLoading(false));
  }, []);

  const navigate = (page: string) => {
    if (page.startsWith('catalog?type=')) {
      const type = page.split('=')[1];
      setCatalogType(type);
      setCurrentPage('catalog');
      return;
    }
    if (page === 'admin' && !isAdmin) return;
    if ((page === 'orders' || page === 'account') && !user) {
      setCurrentPage('auth');
      return;
    }
    if (page === 'checkout' && !user) {
      setCurrentPage('auth');
      return;
    }
    setCatalogType('');
    setCurrentPage(page);
    setProductId(null);
    window.scrollTo(0, 0);
  };

  const viewProduct = (id: string) => {
    setProductId(id);
    setCurrentPage('product');
    window.scrollTo(0, 0);
  };

  if (loading || maintenanceLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show maintenance page to non-admin visitors
  if (maintenance.enabled && !isAdmin) {
    return (
      <MaintenancePage
        config={{
          title: maintenance.title,
          message: maintenance.message,
          bgImageUrl: maintenance.bgImageUrl,
        }}
        onStaffAccess={() => {
          // Auth state change will re-render with isAdmin = true, which bypasses this gate
          setMaintenance((prev) => ({ ...prev })); // trigger re-render
        }}
      />
    );
  }

  // Admin panel gets its own full-screen layout (no main header)
  if (currentPage === 'admin' && isAdmin) {
    return (
      <>
        {maintenance.enabled && (
          <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-xs font-bold py-2 px-4">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            Maintenance mode is ON — the site is hidden from visitors
          </div>
        )}
        <div className={maintenance.enabled ? 'pt-8' : ''}>
          <AdminPage onNavigate={navigate} />
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {maintenance.enabled && isAdmin && (
        <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-xs font-bold py-2 px-4">
          <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
          Maintenance mode is ON — the site is hidden from visitors
        </div>
      )}
      <div className={maintenance.enabled && isAdmin ? 'pt-8' : ''}>
        <Header currentPage={currentPage} onNavigate={navigate} />
        <PromoModal onNavigate={navigate} />
        {currentPage === 'home' && <HomePage onNavigate={navigate} onViewProduct={viewProduct} />}
        {currentPage === 'catalog' && (
          <CatalogPage onViewProduct={viewProduct} initialType={catalogType} />
        )}
        {currentPage === 'product' && productId && (
          <ProductDetailPage productId={productId} onBack={() => navigate('catalog')} />
        )}
        {currentPage === 'cart' && <CartPage onNavigate={navigate} />}
        {currentPage === 'auth' && <AuthPage onNavigate={navigate} />}
        {currentPage === 'orders' && user && <AccountPage onNavigate={navigate} initialTab="orders" />}
      {currentPage === 'account' && user && <AccountPage onNavigate={navigate} />}
        {currentPage === 'sell' && <SellPage onNavigate={navigate} />}
        {currentPage === 'checkout' && <CheckoutPage onNavigate={navigate} />}
        {currentPage === 'about' && <AboutPage onNavigate={navigate} />}
        {currentPage === 'faq' && <FAQPage onNavigate={navigate} />}
        {currentPage === 'shipping' && <ShippingReturnsPage onNavigate={navigate} />}
        {currentPage === 'contact' && <ContactPage onNavigate={navigate} />}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppContent />
      </CartProvider>
    </AuthProvider>
  );
}
