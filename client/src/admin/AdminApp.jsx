import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Route, Routes } from 'react-router';
import Button from '../components/ui/Button.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useSeo } from '../hooks/useSeo.js';
import { api } from '../services/api.js';
import AdminLayout from './components/AdminLayout.jsx';
import { ConfirmProvider } from './components/ui.jsx';
import { Categories, CollectionEditor, Collections } from './pages/Catalogue.jsx';
import { Homepage } from './pages/Homepage.jsx';
import { Inventory } from './pages/Inventory.jsx';
import { LookbookEditor, Lookbooks } from './pages/Lookbooks.jsx';
import { Customers, OrderDetail, Orders } from './pages/Orders.jsx';
import Overview from './pages/Overview.jsx';
import ProductEditor from './pages/ProductEditor.jsx';
import Products from './pages/Products.jsx';
import { Discounts, Newsletter, Reviews, Settings } from './pages/Store.jsx';

const AdminContext = createContext(null);
export const useAdmin = () => useContext(AdminContext);

const AdminLogin = ({ onSignedIn }) => {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      onSignedIn(await api.post('/admin/auth/login', form));
    } catch (failure) {
      setError(failure.message);
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-ink p-12 text-paper lg:flex">
        <p className="wordmark text-5xl">TFF</p>
        <p className="display max-w-md text-5xl italic">Your store, in your hands.</p>
        <p className="eyebrow text-[0.625rem] text-paper/50">Store admin</p>
      </div>
      <div className="flex items-center justify-center px-5 py-16">
        <form onSubmit={submit} className="w-full max-w-sm space-y-6" noValidate>
          <div>
            <p className="wordmark mb-8 text-4xl lg:hidden">TFF</p>
            <p className="eyebrow mb-3 text-stone">Admin</p>
            <h1 className="display text-5xl">Sign in</h1>
          </div>
          <Input label="Email" type="email" autoComplete="username" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <Button type="submit" full loading={loading}>
            Sign in
          </Button>
          <p className="text-[0.8125rem] text-graphite">
            This area is for TFF staff.{' '}
            <a href="/" className="link-underlined text-ink">
              Return to the store
            </a>
          </p>
        </form>
      </div>
    </div>
  );
};

const AdminApp = () => {
  const [admin, setAdmin] = useState(null);
  const [checked, setChecked] = useState(false);
  useSeo({ title: 'Admin', noindex: true });

  useEffect(() => {
    api
      .get('/admin/auth/me')
      .then(setAdmin)
      .catch(() => {})
      .finally(() => setChecked(true));
  }, []);

  useEffect(() => {
    const signedOut = () => setAdmin(null);
    window.addEventListener('tff:admin-signed-out', signedOut);
    return () => window.removeEventListener('tff:admin-signed-out', signedOut);
  }, []);

  const logout = useCallback(async () => {
    await api.post('/admin/auth/logout').catch(() => {});
    setAdmin(null);
  }, []);

  const value = useMemo(() => ({ admin, logout }), [admin, logout]);

  if (!checked) return <div className="p-10 text-sm text-graphite" role="status">Loading dashboard…</div>;
  // Signed out (or the session expired): every admin URL shows the sign-in screen
  if (!admin) return <AdminLogin onSignedIn={setAdmin} />;

  return (
    <AdminContext.Provider value={value}>
      <ConfirmProvider>
        <Routes>
          <Route element={<AdminLayout />}>
            <Route index element={<Overview />} />
            <Route path="orders" element={<Orders />} />
            <Route path="orders/:id" element={<OrderDetail />} />
            <Route path="customers" element={<Customers />} />
            <Route path="discounts" element={<Discounts />} />
            <Route path="products" element={<Products />} />
            <Route path="products/new" element={<ProductEditor />} />
            <Route path="products/:id" element={<ProductEditor />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="categories" element={<Categories />} />
            <Route path="collections" element={<Collections />} />
            <Route path="collections/new" element={<CollectionEditor />} />
            <Route path="collections/:id" element={<CollectionEditor />} />
            <Route path="homepage" element={<Homepage />} />
            <Route path="lookbook" element={<Lookbooks />} />
            <Route path="lookbook/new" element={<LookbookEditor />} />
            <Route path="lookbook/:id" element={<LookbookEditor />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="newsletter" element={<Newsletter />} />
            <Route path="settings" element={<Settings />} />
            <Route
              path="*"
              element={
                <div className="py-20 text-center">
                  <p className="display text-4xl">That page doesn’t exist.</p>
                  <Button to="/admin" className="mt-6">
                    Back to overview
                  </Button>
                </div>
              }
            />
          </Route>
        </Routes>
      </ConfirmProvider>
    </AdminContext.Provider>
  );
};

export default AdminApp;
