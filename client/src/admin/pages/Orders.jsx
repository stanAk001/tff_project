import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebounced } from '../../hooks/useUi.js';
import { api } from '../../services/api.js';
import { formatDate, formatDateTime, naira, titleCase } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { AdminTable, EmptyState, ErrorNote, PageHeader, Panel, SearchInput, StatusBadge, TablePagination, Tabs, TextInput, useConfirm } from '../components/ui.jsx';

const STATUS_TABS = ['', 'PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const TAB_LABEL = { '': 'All', PENDING: 'Awaiting payment', PAID: 'Paid — to prepare' };

// ── Orders list ──────────────────────────────────────────────────────────

export const Orders = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = Number(searchParams.get('page')) || 1;
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());

  const { data, meta, loading, error, reload } = useFetch('/admin/orders', {
    params: { page, limit: 20, ...(status && { status }), ...(q && { q }) },
    paged: true,
  });

  const columns = [
    {
      key: 'orderNumber',
      header: 'Order',
      render: (order) => (
        <>
          <span className="block font-medium">{order.orderNumber}</span>
          <span className="block text-[0.75rem] text-graphite">{formatDateTime(order.createdAt)}</span>
        </>
      ),
    },
    {
      key: 'customer',
      header: 'Customer',
      render: (order) => (
        <>
          <span className="block">{order.fullName}</span>
          <span className="block text-[0.75rem] text-graphite">{order.city}, {order.state}</span>
        </>
      ),
    },
    { key: 'items', header: 'Items', align: 'right', render: (order) => order.itemCount },
    {
      key: 'payment',
      header: 'Payment',
      render: (order) => <StatusBadge status={order.payment?.status || 'PENDING'} label={{ SUCCESS: 'Paid', PENDING: 'Not paid', FAILED: 'Failed' }[order.payment?.status || 'PENDING']} />,
    },
    { key: 'status', header: 'Order status', render: (order) => <StatusBadge status={order.status} /> },
    { key: 'total', header: 'Amount', align: 'right', render: (order) => naira(order.total) },
  ];

  return (
    <>
      <PageHeader title="Orders" description="Click an order to see what was bought and move it to the next step." />

      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <Tabs
          value={status}
          onChange={(value) => setSearchParams(value ? { status: value } : {})}
          tabs={STATUS_TABS.map((value) => ({
            value,
            label: TAB_LABEL[value] || titleCase(value),
            count: value ? meta?.counts?.[value] ?? 0 : undefined,
          }))}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Order number, name or email" />
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <AdminTable
            caption="Orders"
            columns={columns}
            rows={data || []}
            loading={loading}
            onRowClick={(order) => navigate(`/admin/orders/${order.id}`)}
            empty={
              q || status ? (
                <EmptyState title="No orders here." body="Try another tab or search." />
              ) : (
                <EmptyState title="No orders yet." body="When a customer checks out, their order will appear here." />
              )
            }
          />
          <TablePagination meta={meta} onChange={(next) => setSearchParams({ ...(status && { status }), page: String(next) })} />
        </>
      )}
    </>
  );
};

// ── One order ────────────────────────────────────────────────────────────

const NEXT_ACTION = {
  PAID: { label: 'Mark as paid', help: 'Only use this if the customer paid you another way (for example, a bank transfer).', confirm: true },
  PROCESSING: { label: 'Start preparing', help: 'You’re packing this order.' },
  SHIPPED: { label: 'Mark as shipped', help: 'The order has left. The customer is emailed.' },
  DELIVERED: { label: 'Mark as delivered', help: 'The customer has received it.' },
};

export const OrderDetail = () => {
  const { id } = useParams();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: order, loading, error, reload, setData } = useFetch(`/admin/orders/${id}`);
  const [tracking, setTracking] = useState('');
  const [busy, setBusy] = useState(null);

  if (error) return <ErrorNote error={error} onRetry={reload} />;
  if (loading || !order) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading order">
        <div className="skeleton h-12 w-64" />
        <div className="skeleton h-72" />
      </div>
    );
  }

  const move = async (status) => {
    if (status === 'CANCELLED') {
      const yes = await confirm({
        title: `Cancel order ${order.orderNumber}?`,
        body:
          order.payment?.status === 'SUCCESS'
            ? 'The items go back into stock. This order has been paid for — remember to refund the customer from your Paystack dashboard. This can’t be undone.'
            : 'The items go back into stock. This can’t be undone.',
        confirmLabel: 'Cancel order',
        cancelLabel: 'Keep order',
        danger: true,
      });
      if (!yes) return;
    } else if (NEXT_ACTION[status]?.confirm) {
      const yes = await confirm({ title: 'Mark this order as paid?', body: NEXT_ACTION[status].help, confirmLabel: 'Mark as paid' });
      if (!yes) return;
    }

    setBusy(status);
    try {
      const updated = await api.patch(`/admin/orders/${id}/status`, { status, trackingNumber: status === 'SHIPPED' ? tracking : '' });
      setData(updated);
      toast.success(`Order is now ${titleCase(status).toLowerCase()}.`);
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setBusy(null);
    }
  };

  const forward = order.nextStatuses.filter((status) => status !== 'CANCELLED');
  const canCancel = order.nextStatuses.includes('CANCELLED');

  return (
    <>
      <PageHeader
        title={order.orderNumber}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        back={
          <Link to="/admin/orders" className="link mb-3 inline-block text-[0.8125rem] text-graphite">
            ← All orders
          </Link>
        }
      >
        <StatusBadge status={order.status} />
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="What to do next">
            {forward.length === 0 && !canCancel ? (
              <p className="text-sm text-graphite">
                {order.status === 'DELIVERED' ? 'This order is complete. Nothing more to do.' : 'This order was cancelled.'}
              </p>
            ) : (
              <div className="space-y-5">
                {forward.map((status) => (
                  <div key={status}>
                    {status === 'SHIPPED' && (
                      <TextInput
                        className="mb-3 max-w-sm"
                        label="Tracking number"
                        optional
                        value={tracking}
                        onChange={(event) => setTracking(event.target.value)}
                        placeholder="From your courier"
                      />
                    )}
                    <div className="flex flex-wrap items-center gap-4">
                      <Button variant={status === 'PAID' ? 'outline' : 'solid'} onClick={() => move(status)} loading={busy === status} disabled={Boolean(busy)}>
                        {NEXT_ACTION[status].label}
                      </Button>
                      <p className="text-[0.8125rem] text-graphite">{NEXT_ACTION[status].help}</p>
                    </div>
                  </div>
                ))}
                {order.status === 'PENDING' && (
                  <p className="text-[0.8125rem] text-graphite">
                    This order hasn’t been paid for yet. It confirms automatically when payment arrives, or cancels itself if the customer doesn’t pay.
                  </p>
                )}
                {canCancel && (
                  <button type="button" className="link-underlined text-[0.8125rem] text-danger" onClick={() => move('CANCELLED')} disabled={Boolean(busy)}>
                    Cancel this order
                  </button>
                )}
              </div>
            )}
          </Panel>

          <Panel title={`Items (${order.items.reduce((sum, item) => sum + item.quantity, 0)})`}>
            <ul className="-my-3 divide-y divide-mist">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-center gap-4 py-3 text-sm">
                  <span className="relative block aspect-[4/5] w-12 shrink-0 overflow-hidden bg-bone">
                    {item.imageUrl && <img src={resized(item.imageUrl, 160)} alt="" className="absolute inset-0 size-full object-cover" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{item.name}</span>
                    <span className="block text-[0.8125rem] text-graphite">
                      {item.colour} / {item.size}
                      {item.sku && ` · ${item.sku}`}
                    </span>
                  </span>
                  <span className="tabular-nums text-graphite">× {item.quantity}</span>
                  <span className="w-24 text-right tabular-nums">{naira(item.unitPrice * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-5 space-y-1.5 border-t border-mist pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-graphite">Subtotal</dt><dd className="tabular-nums">{naira(order.subtotal)}</dd></div>
              {order.discountTotal > 0 && (
                <div className="flex justify-between"><dt className="text-graphite">Discount ({order.discountCode})</dt><dd className="tabular-nums">−{naira(order.discountTotal)}</dd></div>
              )}
              <div className="flex justify-between"><dt className="text-graphite">Delivery — {order.deliveryOption}</dt><dd className="tabular-nums">{order.deliveryFee ? naira(order.deliveryFee) : 'Free'}</dd></div>
              <div className="flex justify-between pt-2 text-base font-semibold"><dt>Total</dt><dd className="tabular-nums">{naira(order.total)}</dd></div>
            </dl>
          </Panel>

          <Panel title="History">
            <ol className="space-y-4">
              {[...order.events].reverse().map((event) => (
                <li key={event.id} className="flex gap-4 text-sm">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-ink" aria-hidden="true" />
                  <span>
                    <span className="font-medium">{titleCase(event.status)}</span>
                    {event.note && <span className="text-graphite"> — {event.note}</span>}
                    <span className="block text-[0.8125rem] text-stone">{formatDateTime(event.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <p className="text-sm font-medium">{order.fullName}</p>
            <p className="mt-1 text-sm"><a href={`mailto:${order.email}`} className="link-underlined">{order.email}</a></p>
            <p className="mt-1 text-sm"><a href={`tel:${order.phone}`} className="link-underlined">{order.phone}</a></p>
          </Panel>
          <Panel title="Deliver to">
            <address className="text-sm not-italic leading-relaxed">
              {order.fullName}<br />{order.addressLine}<br />{order.city}, {order.state}
            </address>
            <p className="mt-3 text-[0.8125rem] text-graphite">{order.deliveryOption}</p>
            {order.trackingNumber && <p className="mt-3 text-sm">Tracking: <span className="font-medium">{order.trackingNumber}</span></p>}
          </Panel>
          <Panel title="Payment">
            <StatusBadge status={order.payment?.status || 'PENDING'} label={{ SUCCESS: 'Paid', PENDING: 'Not paid yet', FAILED: 'Failed' }[order.payment?.status || 'PENDING']} />
            <dl className="mt-3 space-y-1 text-[0.8125rem] text-graphite">
              {order.payment?.channel && <div>Paid by: {titleCase(order.payment.channel)}</div>}
              {order.payment?.paidAt && <div>On: {formatDateTime(order.payment.paidAt)}</div>}
              {order.payment?.reference && <div className="break-all">Reference: {order.payment.reference}</div>}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
};

// ── Customers ────────────────────────────────────────────────────────────

const CustomerDrawer = ({ customerId, onClose }) => {
  const { data: customer, loading } = useFetch(customerId ? `/admin/customers/${customerId}` : null);
  return (
    <Modal open={Boolean(customerId)} onClose={onClose} side="right" title="Customer">
      <div className="px-5 py-6 md:px-8">
        {loading || !customer ? (
          <div className="skeleton h-40" role="status" aria-label="Loading customer" />
        ) : (
          <>
            <p className="display text-3xl">{customer.firstName} {customer.lastName}</p>
            <p className="mt-2 text-sm"><a href={`mailto:${customer.email}`} className="link-underlined">{customer.email}</a></p>
            {customer.phone && <p className="mt-1 text-sm">{customer.phone}</p>}
            <p className="mt-1 text-[0.8125rem] text-graphite">Joined {formatDate(customer.createdAt)}</p>

            {customer.addresses[0] && (
              <>
                <h3 className="mb-2 mt-8 text-[0.8125rem] font-semibold">Saved address</h3>
                <address className="text-sm not-italic text-graphite">
                  {customer.addresses[0].line1}, {customer.addresses[0].city}, {customer.addresses[0].state}
                </address>
              </>
            )}

            <h3 className="mb-2 mt-8 text-[0.8125rem] font-semibold">Orders ({customer.orders.length})</h3>
            {customer.orders.length === 0 ? (
              <p className="text-sm text-graphite">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-mist border-y border-mist">
                {customer.orders.map((order) => (
                  <li key={order.id}>
                    <Link to={`/admin/orders/${order.id}`} className="flex items-center justify-between gap-3 py-3 text-sm hover:bg-bone">
                      <span>
                        <span className="block font-medium">{order.orderNumber}</span>
                        <span className="text-[0.75rem] text-graphite">{formatDate(order.createdAt)}</span>
                      </span>
                      <StatusBadge status={order.status} />
                      <span className="tabular-nums">{naira(order.total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export const Customers = () => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState(null);
  const q = useDebounced(query.trim());
  const { data, meta, loading, error, reload } = useFetch('/admin/customers', { params: { page, limit: 20, ...(q && { q }) }, paged: true });

  const columns = [
    {
      key: 'name',
      header: 'Customer',
      render: (customer) => (
        <>
          <span className="block font-medium">{customer.firstName} {customer.lastName}</span>
          <span className="block text-[0.75rem] text-graphite">{customer.email}</span>
        </>
      ),
    },
    { key: 'phone', header: 'Phone', render: (customer) => customer.phone || '—' },
    { key: 'joined', header: 'Joined', render: (customer) => formatDate(customer.createdAt) },
    { key: 'orders', header: 'Paid orders', align: 'right', render: (customer) => customer.orderCount },
    { key: 'spent', header: 'Total spent', align: 'right', render: (customer) => naira(customer.totalSpent) },
  ];

  return (
    <>
      <PageHeader title="Customers" description="People who have created an account. Guests who checked out without one appear on their orders." />
      <div className="mb-4">
        <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Name or email" />
      </div>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <AdminTable
            caption="Customers"
            columns={columns}
            rows={data || []}
            loading={loading}
            onRowClick={(customer) => setOpenId(customer.id)}
            empty={<EmptyState title={q ? 'No customers found.' : 'No customers yet.'} body={q ? undefined : 'Accounts appear here as shoppers sign up.'} />}
          />
          <TablePagination meta={meta} onChange={setPage} />
        </>
      )}
      <CustomerDrawer customerId={openId} onClose={() => setOpenId(null)} />
    </>
  );
};
