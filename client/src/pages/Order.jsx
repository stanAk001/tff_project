import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Button from '../components/ui/Button.jsx';
import { ErrorState, Skeleton } from '../components/ui/Feedback.jsx';
import { Input } from '../components/ui/Field.jsx';
import { CheckIcon } from '../components/ui/Icons.jsx';
import Media from '../components/ui/Media.jsx';
import { useAuth } from '../context/StoreContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo } from '../hooks/useSeo.js';
import { cx, formatDate, formatDateTime, naira, titleCase } from '../utils/format.js';
import { recallOrderEmail, rememberOrderEmail } from '../utils/states.js';

const STEPS = [
  { status: 'PAID', label: 'Confirmed', detail: 'Payment received' },
  { status: 'PROCESSING', label: 'Processing', detail: 'Being prepared' },
  { status: 'SHIPPED', label: 'Shipped', detail: 'On its way' },
  { status: 'DELIVERED', label: 'Delivered', detail: 'With you' },
];

const PAYMENT_LABEL = { SUCCESS: 'Paid', PENDING: 'Awaiting payment', FAILED: 'Not paid' };

const Progress = ({ order }) => {
  if (order.status === 'CANCELLED') {
    return (
      <div className="border border-danger p-5 text-danger" role="status">
        <p className="eyebrow">Order cancelled</p>
        <p className="mt-2 text-sm">{order.events.at(-1)?.note || 'This order was cancelled.'}</p>
      </div>
    );
  }
  if (order.status === 'PENDING') {
    return (
      <div className="border border-ink p-5" role="status">
        <p className="eyebrow">Awaiting payment</p>
        <p className="mt-2 text-sm text-graphite">We haven’t received payment for this order yet. Your pieces are held for a short while.</p>
      </div>
    );
  }

  const reached = STEPS.findIndex((step) => step.status === order.status);
  const dateFor = (status) => order.events.find((event) => event.status === status)?.createdAt;

  return (
    <ol className="grid grid-cols-4" aria-label="Order progress">
      {STEPS.map((step, index) => {
        const done = index <= reached;
        return (
          <li key={step.status} aria-current={index === reached ? 'step' : undefined}>
            <div className="flex items-center">
              <span
                className={cx(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border',
                  done ? 'border-ink bg-ink text-paper' : 'border-mist bg-paper text-stone',
                )}
              >
                {done ? <CheckIcon size={11} /> : <span className="size-1.5 rounded-full bg-mist" />}
              </span>
              {index < STEPS.length - 1 && <span className={cx('h-px flex-1', index < reached ? 'bg-ink' : 'bg-mist')} aria-hidden="true" />}
            </div>
            <p className={cx('eyebrow mt-4 text-[0.625rem]', !done && 'text-stone')}>{step.label}</p>
            <p className="mt-1.5 hidden text-[0.8125rem] text-graphite sm:block">
              {dateFor(step.status) ? formatDate(dateFor(step.status), { day: 'numeric', month: 'short' }) : step.detail}
            </p>
            <span className="sr-only">{done ? ' — done' : ' — not yet'}</span>
          </li>
        );
      })}
    </ol>
  );
};

const OrderDetails = ({ order, justPlaced }) => (
  <div className="shell pb-24 pt-10 md:pb-32 md:pt-16">
    <header className="max-w-3xl">
      <p className="eyebrow mb-4 text-stone">{justPlaced ? 'Order confirmed' : 'Your order'}</p>
      <h1 className="display text-5xl md:text-7xl">{justPlaced ? 'Thank you.' : order.orderNumber}</h1>
      {justPlaced && (
        <p className="mt-5 text-graphite">
          Order <span className="font-medium text-ink">{order.orderNumber}</span> is confirmed. A receipt is on its way to {order.email}.
        </p>
      )}
      <p className="mt-3 text-sm text-graphite">Placed {formatDateTime(order.createdAt)}</p>
    </header>

    <div className="mt-12 grid gap-x-20 gap-y-14 lg:grid-cols-[1fr_24rem]">
      <div>
        <Progress order={order} />
        {order.trackingNumber && (
          <p className="mt-8 text-sm">
            <span className="text-graphite">Tracking number</span> <span className="font-medium">{order.trackingNumber}</span>
          </p>
        )}

        <h2 className="eyebrow mb-2 mt-14">Items</h2>
        <ul className="divide-y divide-mist border-y border-mist">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-4 py-5">
              <div className="relative aspect-[4/5] w-20 shrink-0 overflow-hidden">
                <Media src={item.imageUrl} alt="" sizes="80px" maxWidth={320} compactPlaceholder />
              </div>
              <div className="min-w-0 flex-1">
                {item.slug ? (
                  <Link to={`/products/${item.slug}`} className="text-sm font-medium">
                    {item.name}
                  </Link>
                ) : (
                  <p className="text-sm font-medium">{item.name}</p>
                )}
                <p className="mt-0.5 text-[0.8125rem] text-graphite">
                  {item.colour} / {item.size}
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-graphite">Qty {item.quantity}</p>
              </div>
              <p className="text-sm tabular-nums">{naira(item.unitPrice * item.quantity)}</p>
            </li>
          ))}
        </ul>
      </div>

      <aside className="space-y-10">
        <section>
          <h2 className="eyebrow mb-4">Summary</h2>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <dt className="text-graphite">Subtotal</dt>
              <dd className="tabular-nums">{naira(order.subtotal)}</dd>
            </div>
            {order.discountTotal > 0 && (
              <div className="flex justify-between">
                <dt className="text-graphite">Discount{order.discountCode ? ` (${order.discountCode})` : ''}</dt>
                <dd className="tabular-nums">−{naira(order.discountTotal)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-graphite">Delivery</dt>
              <dd className="tabular-nums">{order.deliveryFee ? naira(order.deliveryFee) : 'Free'}</dd>
            </div>
            <div className="flex justify-between border-t border-ink pt-3 text-base font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{naira(order.total)}</dd>
            </div>
          </dl>
        </section>

        <section>
          <h2 className="eyebrow mb-4">Payment</h2>
          <p className="text-sm">
            {PAYMENT_LABEL[order.payment?.status] || 'Awaiting payment'}
            {order.payment?.channel && order.payment.status === 'SUCCESS' && (
              <span className="text-graphite"> · {titleCase(order.payment.channel)}</span>
            )}
          </p>
        </section>

        <section>
          <h2 className="eyebrow mb-4">Delivery</h2>
          <address className="text-sm not-italic leading-relaxed">
            {order.fullName}
            <br />
            {order.addressLine}
            <br />
            {order.city}, {order.state}
            <br />
            <span className="text-graphite">{order.phone}</span>
          </address>
          <p className="mt-3 text-sm text-graphite">{order.deliveryOption}</p>
        </section>

        <Button variant="outline" to="/shop" full>
          Continue shopping
        </Button>
      </aside>
    </div>
  </div>
);

// Guests confirm the email the order was placed with before anything is shown
const EmailGate = ({ orderNumber, error, onSubmit }) => {
  const [email, setEmail] = useState('');
  return (
    <div className="mx-auto max-w-md px-5 py-20 md:py-28">
      <p className="eyebrow mb-4 text-stone">Track your order</p>
      <h1 className="display text-5xl">{orderNumber}</h1>
      <p className="mt-4 text-graphite">Enter the email address used for this order to see its progress.</p>
      <form
        className="mt-8 space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit(email.trim().toLowerCase());
        }}
      >
        <Input
          label="Email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={error}
        />
        <Button type="submit" full>
          View order
        </Button>
      </form>
    </div>
  );
};

export const Order = () => {
  const { orderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const { customer, ready } = useAuth();
  const [email, setEmail] = useState(recallOrderEmail);
  const [asked, setAsked] = useState(false);

  const { data: order, loading, error, reload } = useFetch(ready ? `/orders/${orderNumber}` : null, {
    params: email ? { email } : undefined,
  });

  if (!ready || loading) {
    return (
      <div className="shell py-16" role="status" aria-label="Loading order">
        <Seo title="Your order" noindex />
        <Skeleton className="h-16 w-72" />
        <Skeleton className="mt-10 h-24 w-full max-w-3xl" />
        <Skeleton className="mt-10 h-64 w-full max-w-3xl" />
      </div>
    );
  }

  if (error?.status === 404) {
    return (
      <>
        <Seo title="Track your order" noindex />
        <EmailGate
          orderNumber={orderNumber.toUpperCase()}
          error={asked ? error.message : customer ? 'This order isn’t on your account. Enter the email it was placed with.' : undefined}
          onSubmit={(value) => {
            rememberOrderEmail(value);
            setAsked(true);
            if (value === email) reload();
            else setEmail(value);
          }}
        />
      </>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <Seo title={`Order ${order.orderNumber}`} noindex />
      <OrderDetails order={order} justPlaced={searchParams.get('placed') === '1' && order.status !== 'PENDING'} />
    </>
  );
};

// ── /track ───────────────────────────────────────────────────────────────

export const TrackOrder = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState({ orderNumber: '', email: '' });

  const submit = (event) => {
    event.preventDefault();
    rememberOrderEmail(form.email.trim().toLowerCase());
    navigate(`/orders/${form.orderNumber.trim().toUpperCase()}`);
  };

  return (
    <div className="mx-auto max-w-md px-5 py-20 md:py-28">
      <Seo title="Track an order" description="Check the progress of your TFF order." />
      <p className="eyebrow mb-4 text-stone">Orders</p>
      <h1 className="display text-5xl md:text-6xl">Track an order</h1>
      <p className="mt-4 text-graphite">Your order number is in your confirmation email — it starts with TFF.</p>
      <form className="mt-10 space-y-6" onSubmit={submit}>
        <Input
          label="Order number"
          required
          placeholder="TFF-XXXXXXXX"
          value={form.orderNumber}
          onChange={(event) => setForm({ ...form, orderNumber: event.target.value })}
          autoCapitalize="characters"
        />
        <Input label="Email" type="email" required autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
        <Button type="submit" full>
          Track order
        </Button>
      </form>
    </div>
  );
};
