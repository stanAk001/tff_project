import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { Skeleton } from './components/ui/Feedback.jsx';
import { StoreProvider } from './context/StoreContext.jsx';
import StoreLayout, { CheckoutLayout, ScrollToTop } from './layouts/StoreLayout.jsx';
import Home from './pages/Home.jsx';

// The homepage ships in the first download; everything else loads when it is visited.
const Shop = lazy(() => import('./pages/Shop.jsx'));
const Product = lazy(() => import('./pages/Product.jsx'));
const Lookbook = lazy(() => import('./pages/Lookbook.jsx'));
const Checkout = lazy(() => import('./pages/Checkout.jsx'));
const Collections = lazy(() => import('./pages/Collections.jsx').then((m) => ({ default: m.Collections })));
const Collection = lazy(() => import('./pages/Collections.jsx').then((m) => ({ default: m.Collection })));
const CheckoutVerify = lazy(() => import('./pages/CheckoutPayment.jsx').then((m) => ({ default: m.CheckoutVerify })));
const CheckoutSandbox = lazy(() => import('./pages/CheckoutPayment.jsx').then((m) => ({ default: m.CheckoutSandbox })));
const Order = lazy(() => import('./pages/Order.jsx').then((m) => ({ default: m.Order })));
const TrackOrder = lazy(() => import('./pages/Order.jsx').then((m) => ({ default: m.TrackOrder })));
const Login = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Login })));
const Register = lazy(() => import('./pages/Auth.jsx').then((m) => ({ default: m.Register })));
const Account = lazy(() => import('./pages/Account.jsx').then((m) => ({ default: m.Account })));
const Wishlist = lazy(() => import('./pages/Account.jsx').then((m) => ({ default: m.Wishlist })));
const NotFound = lazy(() => import('./pages/Account.jsx').then((m) => ({ default: m.NotFound })));
const RequireCustomer = lazy(() => import('./pages/Account.jsx').then((m) => ({ default: m.RequireCustomer })));

// The admin is a separate bundle — shoppers never download it
const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

const PageFallback = () => (
  <div className="shell py-16" role="status" aria-label="Loading page">
    <Skeleton className="h-4 w-24" />
    <Skeleton className="mt-5 h-16 w-2/3 max-w-xl" />
    <Skeleton className="mt-12 h-72 w-full" />
  </div>
);

const Storefront = () => (
  <StoreProvider>
    <ScrollToTop />
    <Suspense fallback={<PageFallback />}>
      <Routes>
        <Route element={<StoreLayout />}>
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="products/:slug" element={<Product />} />
          <Route path="collections" element={<Collections />} />
          <Route path="collections/:slug" element={<Collection />} />
          <Route path="lookbook" element={<Lookbook />} />
          <Route path="orders/:orderNumber" element={<Order />} />
          <Route path="track" element={<TrackOrder />} />
          <Route path="login" element={<Login />} />
          <Route path="register" element={<Register />} />
          <Route
            path="account"
            element={
              <RequireCustomer>
                <Account />
              </RequireCustomer>
            }
          />
          <Route
            path="wishlist"
            element={
              <RequireCustomer>
                <Wishlist />
              </RequireCustomer>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Route>
        <Route element={<CheckoutLayout />}>
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/verify" element={<CheckoutVerify />} />
          <Route path="checkout/sandbox" element={<CheckoutSandbox />} />
        </Route>
      </Routes>
    </Suspense>
  </StoreProvider>
);

const App = () => (
  <Routes>
    <Route
      path="admin/*"
      element={
        <Suspense fallback={<div className="p-10 text-sm text-graphite">Loading dashboard…</div>}>
          <AdminApp />
        </Suspense>
      }
    />
    <Route path="*" element={<Storefront />} />
  </Routes>
);

export default App;
