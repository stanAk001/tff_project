import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import ProductCard from '../components/product/ProductCard.jsx';
import { useQuickAdd } from '../components/product/ProductGrid.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorState, Pagination, Skeleton, StateMessage } from '../components/ui/Feedback.jsx';
import { Input } from '../components/ui/Field.jsx';
import { useAuth, useWishlist } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo } from '../hooks/useSeo.js';
import { fieldErrors } from '../services/api.js';
import { formatDate, naira, titleCase } from '../utils/format.js';

// Sends signed-out visitors to the sign-in page and brings them back afterwards
export const RequireCustomer = ({ children }) => {
  const { customer, ready } = useAuth();
  const location = useLocation();
  if (!ready) {
    return (
      <div className="shell py-16" role="status" aria-label="Loading">
        <Skeleton className="h-16 w-64" />
      </div>
    );
  }
  if (!customer) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  return children;
};

const OrderHistory = () => {
  const [page, setPage] = useState(1);
  const { data: orders, meta, loading, error, reload } = useFetch('/orders', { params: { page, limit: 10 }, paged: true });

  if (loading) {
    return (
      <div className="space-y-3" role="status" aria-label="Loading orders">
        {[0, 1, 2].map((row) => (
          <Skeleton key={row} className="h-20" />
        ))}
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;
  if (orders.length === 0) {
    return (
      <div className="border border-mist p-8 text-center">
        <p className="display text-3xl">No orders yet.</p>
        <p className="mt-3 text-graphite">When you place an order it will appear here.</p>
        <Button to="/shop" className="mt-6">
          Start shopping
        </Button>
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-mist border-y border-mist">
        {orders.map((order) => (
          <li key={order.id}>
            <Link to={`/orders/${order.orderNumber}`} className="group flex flex-wrap items-center gap-x-6 gap-y-2 py-5">
              <div className="min-w-40 flex-1">
                <p className="text-sm font-medium">{order.orderNumber}</p>
                <p className="text-[0.8125rem] text-graphite">
                  {formatDate(order.createdAt)} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} items
                </p>
              </div>
              <p className="eyebrow text-[0.625rem]">{titleCase(order.status)}</p>
              <p className="w-24 text-right text-sm tabular-nums">{naira(order.total)}</p>
              <span className="eyebrow link-underlined text-[0.625rem]">View</span>
            </Link>
          </li>
        ))}
      </ul>
      <Pagination page={meta.page} pages={meta.pages} onChange={setPage} />
    </>
  );
};

const ProfileForm = () => {
  const auth = useAuth();
  const toast = useToast();
  const { customer } = auth;
  const [form, setForm] = useState({
    firstName: customer.firstName,
    lastName: customer.lastName,
    phone: customer.phone || '',
    currentPassword: '',
    newPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const field = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (event) => setForm({ ...form, [name]: event.target.value }),
  });

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      await auth.update(form);
      setForm((current) => ({ ...current, currentPassword: '', newPassword: '' }));
      toast.success('Your details have been saved.');
    } catch (error) {
      const fields = fieldErrors(error);
      setErrors(fields);
      if (!Object.keys(fields).length) toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6" noValidate>
      <div className="grid grid-cols-2 gap-5">
        <Input label="First name" autoComplete="given-name" {...field('firstName')} />
        <Input label="Last name" autoComplete="family-name" {...field('lastName')} />
      </div>
      <Input label="Email" value={customer.email} disabled readOnly hint="Contact us to change your email." />
      <Input label="Phone" type="tel" autoComplete="tel" {...field('phone')} />
      <fieldset className="space-y-6 border-t border-mist pt-6">
        <legend className="eyebrow float-left mb-6 w-full text-stone">Change password (optional)</legend>
        <Input className="clear-both" label="Current password" type="password" autoComplete="current-password" {...field('currentPassword')} />
        <Input label="New password" type="password" autoComplete="new-password" {...field('newPassword')} />
      </fieldset>
      <Button type="submit" loading={saving}>
        Save changes
      </Button>
    </form>
  );
};

export const Account = () => {
  const auth = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await auth.logout();
    navigate('/');
  };

  return (
    <div className="shell pb-24 pt-10 md:pb-32 md:pt-16">
      <Seo title="Your account" noindex />
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="eyebrow mb-4 text-stone">Account</p>
          <h1 className="display text-5xl md:text-7xl">Hello, {auth.customer.firstName}.</h1>
        </div>
        <button type="button" onClick={signOut} className="eyebrow link-underlined">
          Sign out
        </button>
      </header>

      <div className="mt-14 grid gap-16 lg:grid-cols-[1fr_24rem] lg:gap-24">
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="eyebrow mb-6">
            Your orders
          </h2>
          <OrderHistory />
        </section>
        <section aria-labelledby="details-heading">
          <h2 id="details-heading" className="eyebrow mb-6">
            Your details
          </h2>
          <ProfileForm />
        </section>
      </div>
    </div>
  );
};

export const Wishlist = () => {
  const wishlist = useWishlist();
  const [quickAdd, quickAddModal] = useQuickAdd();

  return (
    <div className="shell pb-24 pt-10 md:pb-32 md:pt-16">
      <Seo title="Wishlist" noindex />
      <header className="mb-10 md:mb-14">
        <p className="eyebrow mb-4 text-stone">Saved</p>
        <h1 className="display text-5xl md:text-8xl">Wishlist</h1>
      </header>

      {wishlist.items.length === 0 ? (
        <StateMessage title="Nothing saved yet." body="Tap the heart on any piece to keep it here for later.">
          <Button to="/shop">Explore the collection</Button>
        </StateMessage>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-12 md:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
          {wishlist.items.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} onQuickAdd={quickAdd} />
              <div className="mt-3 flex gap-5">
                {!product.soldOut && (
                  <button type="button" className="eyebrow link-underlined text-[0.625rem]" onClick={() => quickAdd(product)}>
                    Move to bag
                  </button>
                )}
                <button type="button" className="eyebrow link text-[0.625rem] text-graphite" onClick={() => wishlist.toggle(product)}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {quickAddModal}
    </div>
  );
};

export const NotFound = () => (
  <StateMessage eyebrow="404" title="This page has moved on." body="The link may be out of date, or the page may have been removed.">
    <Seo title="Page not found" noindex />
    <Button to="/">Back to home</Button>
    <Button variant="outline" to="/shop">
      Shop all pieces
    </Button>
  </StateMessage>
);
