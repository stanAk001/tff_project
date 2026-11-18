import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { Stars } from '../../components/ui/Feedback.jsx';
import { CloseIcon } from '../../components/ui/Icons.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebounced } from '../../hooks/useUi.js';
import { api, fieldErrors } from '../../services/api.js';
import { formatDate, naira } from '../../utils/format.js';
import { AdminTable, EmptyState, ErrorNote, PageHeader, Panel, SearchInput, SelectInput, StatusBadge, TablePagination, Tabs, TextArea, TextInput, Toggle, useConfirm } from '../components/ui.jsx';

// ═════════════════════════════════════════════════════════════════════════
// Discounts
// ═════════════════════════════════════════════════════════════════════════

const BLANK_DISCOUNT = { code: '', type: 'PERCENTAGE', value: '', minOrderAmount: '', usageLimit: '', expiresAt: '', active: true };

const discountState = (discount) => {
  if (!discount.active) return { status: 'DRAFT', label: 'Switched off' };
  if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) return { status: 'CANCELLED', label: 'Expired' };
  if (discount.usageLimit != null && discount.usedCount >= discount.usageLimit) return { status: 'ARCHIVED', label: 'Used up' };
  return { status: 'ACTIVE', label: 'Active' };
};

const DiscountForm = ({ discount, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState(
    discount
      ? {
          ...discount,
          minOrderAmount: discount.minOrderAmount || '',
          usageLimit: discount.usageLimit ?? '',
          expiresAt: discount.expiresAt ? discount.expiresAt.slice(0, 10) : '',
        }
      : BLANK_DISCOUNT,
  );
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const bind = (name) => ({ value: form[name], error: errors[name], onChange: (event) => setForm({ ...form, [name]: event.target.value }) });

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    try {
      const payload = {
        code: form.code,
        type: form.type,
        value: Number(form.value) || 0,
        minOrderAmount: Number(form.minOrderAmount) || 0,
        usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
        // A code is valid through the end of its last day
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        active: form.active,
      };
      if (discount) await api.put(`/admin/discounts/${discount.id}`, payload);
      else await api.post('/admin/discounts', payload);
      toast.success(discount ? 'Discount saved.' : 'Discount code created.');
      onSaved();
    } catch (failure) {
      const fields = fieldErrors(failure);
      setErrors(fields);
      if (!Object.keys(fields).length) setErrors({ code: failure.message });
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-5 px-5 py-6 md:px-8">
      <TextInput label="Code" placeholder="e.g. WELCOME10" hint="What customers type at checkout. Letters and numbers only." style={{ textTransform: 'uppercase' }} {...bind('code')} />
      <div className="grid grid-cols-2 gap-4">
        <SelectInput label="Type" {...bind('type')}>
          <option value="PERCENTAGE">Percentage off</option>
          <option value="FIXED">Fixed amount off</option>
        </SelectInput>
        <TextInput label={form.type === 'PERCENTAGE' ? 'Percent off' : 'Amount off'} type="number" min="1" prefix={form.type === 'FIXED' ? '₦' : undefined} placeholder={form.type === 'PERCENTAGE' ? '10' : '5000'} {...bind('value')} />
      </div>
      <TextInput label="Minimum order" optional type="number" min="0" prefix="₦" hint="The code only works on orders of at least this much." {...bind('minOrderAmount')} />
      <div className="grid grid-cols-2 gap-4">
        <TextInput label="Total uses allowed" optional type="number" min="1" hint="Leave blank for unlimited." {...bind('usageLimit')} />
        <TextInput label="Last day valid" optional type="date" hint="Leave blank for no end date." {...bind('expiresAt')} />
      </div>
      <Toggle label="Active" description="Switch off to stop the code working without deleting it." checked={form.active} onChange={(active) => setForm({ ...form, active })} />
      <div className="flex justify-end gap-3 border-t border-mist pt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>{discount ? 'Save discount' : 'Create discount'}</Button>
      </div>
    </form>
  );
};

export const Discounts = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { data, loading, error, reload } = useFetch('/admin/discounts');
  const [editing, setEditing] = useState(null);

  const setActive = async (discount, active) => {
    try {
      await api.put(`/admin/discounts/${discount.id}`, { ...discount, active });
      toast.success(active ? `${discount.code} is active again.` : `${discount.code} has been switched off.`);
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const remove = async (discount) => {
    const yes = await confirm({ title: `Delete ${discount.code}?`, body: 'Customers will no longer be able to use this code. Past orders that used it are not affected.', confirmLabel: 'Delete code', danger: true });
    if (!yes) return;
    try {
      await api.delete(`/admin/discounts/${discount.id}`);
      toast.success('Discount deleted.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const columns = [
    { key: 'code', header: 'Code', render: (discount) => <span className="font-medium tracking-wide">{discount.code}</span> },
    { key: 'value', header: 'Discount', render: (discount) => (discount.type === 'PERCENTAGE' ? `${discount.value}% off` : `${naira(discount.value)} off`) },
    { key: 'min', header: 'Minimum order', render: (discount) => (discount.minOrderAmount ? naira(discount.minOrderAmount) : 'None') },
    { key: 'used', header: 'Used', align: 'right', render: (discount) => `${discount.usedCount}${discount.usageLimit != null ? ` of ${discount.usageLimit}` : ''}` },
    { key: 'expires', header: 'Ends', render: (discount) => (discount.expiresAt ? formatDate(discount.expiresAt) : 'No end date') },
    { key: 'status', header: 'Status', render: (discount) => <StatusBadge {...discountState(discount)} /> },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (discount) => (
        <div className="flex justify-end gap-4 text-[0.8125rem]" onClick={(event) => event.stopPropagation()}>
          <button type="button" className="link-underlined" onClick={() => setActive(discount, !discount.active)}>{discount.active ? 'Switch off' : 'Switch on'}</button>
          <button type="button" className="link-underlined text-danger" onClick={() => remove(discount)}>Delete</button>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Discounts" description="Codes customers can enter at checkout.">
        <Button onClick={() => setEditing('new')}>Create discount</Button>
      </PageHeader>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <AdminTable
          caption="Discount codes"
          columns={columns}
          rows={data || []}
          loading={loading}
          onRowClick={setEditing}
          empty={
            <EmptyState title="No discount codes yet." body="Create a code to reward first-time customers or run a promotion.">
              <Button onClick={() => setEditing('new')}>Create discount</Button>
            </EmptyState>
          }
        />
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? 'Create discount' : 'Edit discount'}>
        {editing && (
          <DiscountForm
            key={editing === 'new' ? 'new' : editing.id}
            discount={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); reload(); }}
          />
        )}
      </Modal>
    </>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// Reviews
// ═════════════════════════════════════════════════════════════════════════

export const Reviews = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') ?? 'PENDING';
  const page = Number(searchParams.get('page')) || 1;
  const { data, meta, loading, error, reload } = useFetch('/admin/reviews', { params: { page, limit: 20, ...(status && { status }) }, paged: true });

  const setStatus = async (review, next) => {
    try {
      await api.patch(`/admin/reviews/${review.id}`, { status: next });
      toast.success(next === 'APPROVED' ? 'Review approved — it now shows on the product page.' : 'Review hidden from the store.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const remove = async (review) => {
    const yes = await confirm({ title: 'Delete this review?', body: 'It will be removed permanently. To simply hide it from the store, reject it instead.', confirmLabel: 'Delete review', danger: true });
    if (!yes) return;
    try {
      await api.delete(`/admin/reviews/${review.id}`);
      toast.success('Review deleted.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  return (
    <>
      <PageHeader title="Reviews" description="Reviews only appear in the store after you approve them." />
      <div className="mb-4">
        <Tabs
          value={status}
          onChange={(value) => setSearchParams({ status: value })}
          tabs={[
            { value: 'PENDING', label: 'Waiting for you', count: meta?.pending },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
            { value: '', label: 'All' },
          ]}
        />
      </div>

      {error && <ErrorNote error={error} onRetry={reload} />}
      {loading && <div className="skeleton h-40" role="status" aria-label="Loading reviews" />}
      {!loading && data?.length === 0 && (
        <div className="border border-mist bg-white px-6 py-14 text-center">
          <EmptyState
            title={status === 'PENDING' ? 'You’re all caught up.' : 'No reviews here.'}
            body={status === 'PENDING' ? 'New reviews from customers will wait here for your approval.' : undefined}
          />
        </div>
      )}
      {!loading && data?.length > 0 && (
        <ul className="space-y-3">
          {data.map((review) => (
            <li key={review.id} className="border border-mist bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Stars rating={review.rating} />
                  <p className="mt-2 font-medium">{review.title}</p>
                </div>
                <StatusBadge status={review.status} label={review.status === 'PENDING' ? 'Waiting for approval' : undefined} />
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-graphite">{review.comment}</p>
              <p className="mt-3 text-[0.8125rem] text-stone">
                {review.customer.firstName} {review.customer.lastName} ({review.customer.email}) on{' '}
                <Link to={`/products/${review.product.slug}`} target="_blank" className="link-underlined text-ink">{review.product.name}</Link> · {formatDate(review.createdAt)}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {review.status !== 'APPROVED' && <Button size="sm" onClick={() => setStatus(review, 'APPROVED')}>Approve</Button>}
                {review.status !== 'REJECTED' && <Button size="sm" variant="outline" onClick={() => setStatus(review, 'REJECTED')}>{review.status === 'APPROVED' ? 'Hide' : 'Reject'}</Button>}
                <Button size="sm" variant="danger" onClick={() => remove(review)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <TablePagination meta={meta} onChange={(next) => setSearchParams({ status, page: String(next) })} />
    </>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// Newsletter
// ═════════════════════════════════════════════════════════════════════════

export const Newsletter = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());
  const { data, meta, loading, error, reload } = useFetch('/admin/newsletter', { params: { page, limit: 50, ...(q && { q }) }, paged: true });

  const remove = async (subscriber) => {
    const yes = await confirm({ title: `Remove ${subscriber.email}?`, body: 'They will be taken off your list.', confirmLabel: 'Remove', danger: true });
    if (!yes) return;
    try {
      await api.delete(`/admin/newsletter/${subscriber.id}`);
      toast.success('Subscriber removed.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const columns = [
    { key: 'email', header: 'Email', render: (subscriber) => <span className="font-medium">{subscriber.email}</span> },
    { key: 'date', header: 'Joined', render: (subscriber) => formatDate(subscriber.createdAt) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (subscriber) => (
        <button type="button" onClick={() => remove(subscriber)} aria-label={`Remove ${subscriber.email}`} className="inline-flex size-8 items-center justify-center text-graphite hover:text-danger">
          <CloseIcon size={10} />
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Newsletter" description={`People who asked to hear about new drops${meta ? ` — ${meta.total} in total` : ''}. Download the list to use it in your email tool.`}>
        <Button variant="outline" href="/api/admin/newsletter/export" download>
          Download list (CSV)
        </Button>
      </PageHeader>
      <div className="mb-4">
        <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Search emails" />
      </div>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <AdminTable
            caption="Newsletter subscribers"
            columns={columns}
            rows={data || []}
            loading={loading}
            empty={<EmptyState title={q ? 'No matching emails.' : 'No subscribers yet.'} body={q ? undefined : 'Sign-ups from the homepage and footer will appear here.'} />}
          />
          <TablePagination meta={meta} onChange={setPage} />
        </>
      )}
    </>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// Settings
// ═════════════════════════════════════════════════════════════════════════

const PasswordPanel = () => {
  const toast = useToast();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/auth/password', form);
      setForm({ currentPassword: '', newPassword: '' });
      toast.success('Password changed.');
    } catch (failure) {
      setError(failure.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Your password">
      <form onSubmit={save} className="grid max-w-xl gap-5 sm:grid-cols-2">
        <TextInput label="Current password" type="password" autoComplete="current-password" value={form.currentPassword} onChange={(event) => setForm({ ...form, currentPassword: event.target.value })} />
        <TextInput label="New password" type="password" autoComplete="new-password" hint="At least 10 characters." error={error} value={form.newPassword} onChange={(event) => setForm({ ...form, newPassword: event.target.value })} />
        <div className="sm:col-span-2">
          <Button type="submit" variant="outline" loading={saving} disabled={!form.currentPassword || !form.newPassword}>Change password</Button>
        </div>
      </form>
    </Panel>
  );
};

export const Settings = () => {
  const toast = useToast();
  const { data, loading, error, reload } = useFetch('/admin/settings');
  const [store, setStore] = useState(null);
  const [delivery, setDelivery] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setStore(data.store);
    setDelivery(data.delivery);
  }, [data]);

  const bind = (name) => ({ value: store[name] ?? '', onChange: (event) => setStore({ ...store, [name]: event.target.value }) });
  const setOption = (index, changes) => setDelivery(delivery.map((option, i) => (i === index ? { ...option, ...changes } : option)));

  const save = async (event) => {
    event.preventDefault();
    if (delivery.some((option) => !option.name.trim())) return toast.error('Every delivery option needs a name.');
    setSaving(true);
    try {
      await api.put('/admin/settings', {
        store,
        delivery: delivery.map((option) => ({ ...option, price: Number(option.price) || 0, freeAbove: Number(option.freeAbove) || 0 })),
      });
      toast.success('Settings saved.');
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (loading || !store) return <div className="skeleton h-96" role="status" aria-label="Loading settings" />;

  return (
    <>
      <form onSubmit={save}>
        <PageHeader title="Settings" description="Store-wide details shown to customers.">
          <Button type="submit" loading={saving}>Save settings</Button>
        </PageHeader>

        <div className="space-y-6">
          <Panel title="Announcement bar" description="The thin strip at the very top of every page. Leave blank to hide it.">
            <TextInput label="Message" optional maxLength={160} placeholder="e.g. Free delivery in Lagos on orders over ₦150,000" {...bind('announcement')} />
          </Panel>

          <Panel title="Delivery options" description="What customers can choose at checkout, and what each costs.">
            <ul className="space-y-3">
              {delivery.map((option, index) => (
                <li key={option.id} className="grid items-end gap-3 border border-mist p-4 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.4fr_8rem_9rem_auto]">
                  <TextInput label="Name" value={option.name} onChange={(event) => setOption(index, { name: event.target.value })} />
                  <TextInput label="Timing note" optional value={option.description} onChange={(event) => setOption(index, { description: event.target.value })} placeholder="e.g. 1–3 working days" />
                  <TextInput label="Price" type="number" min="0" prefix="₦" value={option.price} onChange={(event) => setOption(index, { price: event.target.value })} />
                  <TextInput label="Free on orders over" optional type="number" min="0" prefix="₦" value={option.freeAbove || ''} onChange={(event) => setOption(index, { freeAbove: event.target.value })} />
                  <button
                    type="button"
                    disabled={delivery.length === 1}
                    onClick={() => setDelivery(delivery.filter((_, i) => i !== index))}
                    className="link-underlined pb-3 text-[0.8125rem] text-danger disabled:opacity-30"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              disabled={delivery.length >= 10}
              onClick={() => setDelivery([...delivery, { id: `option-${Date.now()}`, name: '', description: '', price: 0, freeAbove: 0 }])}
            >
              + Add a delivery option
            </Button>
          </Panel>

          <Panel title="Information on product pages">
            <div className="grid gap-5 md:grid-cols-2">
              <TextArea label="Delivery information" rows={4} {...bind('deliveryInfo')} />
              <TextArea label="Returns information" rows={4} {...bind('returnsInfo')} />
            </div>
          </Panel>

          <Panel title="Stock warnings">
            <TextInput
              className="max-w-xs"
              label="Warn when stock falls to"
              type="number"
              min="0"
              hint="Shoppers see “Low stock — X left” at or below this number, and the item appears under Low stock in Inventory."
              {...bind('lowStockThreshold')}
            />
          </Panel>

          <Panel title="Contact details" description="Shown in the footer of the store.">
            <div className="grid max-w-2xl gap-5 sm:grid-cols-2">
              <TextInput label="Contact email" optional type="email" {...bind('contactEmail')} />
              <TextInput label="Instagram link" optional placeholder="https://instagram.com/…" {...bind('instagram')} />
            </div>
          </Panel>
        </div>
      </form>

      <div className="mt-6">
        <PasswordPanel />
      </div>
    </>
  );
};
