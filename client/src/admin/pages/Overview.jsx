import { useState } from 'react';
import { Link } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { cx, formatDate, naira } from '../../utils/format.js';
import { useAdmin } from '../AdminApp.jsx';
import { ErrorNote, PageHeader, Panel, StatusBadge } from '../components/ui.jsx';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
];

const compactNaira = (value) =>
  value >= 1_000_000 ? `₦${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')}m` : value >= 1000 ? `₦${Math.round(value / 1000)}k` : `₦${value}`;

// Change versus the previous period of the same length, in words — never colour alone
const Change = ({ current, previous }) => {
  if (!previous) return <p className="mt-1 text-[0.8125rem] text-stone">No earlier period to compare</p>;
  const percent = Math.round(((current - previous) / previous) * 100);
  return (
    <p className={cx('mt-1 text-[0.8125rem]', percent >= 0 ? 'text-success' : 'text-danger')}>
      {percent >= 0 ? '▲' : '▼'} {Math.abs(percent)}% vs previous period
    </p>
  );
};

const Stat = ({ label, value, children, to }) => {
  const body = (
    <>
      <p className="text-[0.8125rem] text-graphite">{label}</p>
      <p className="display mt-2 text-4xl tabular-nums">{value}</p>
      {children}
    </>
  );
  return to ? (
    <Link to={to} className="block border border-mist bg-white p-5 transition-colors hover:border-ink">
      {body}
    </Link>
  ) : (
    <div className="border border-mist bg-white p-5">{body}</div>
  );
};

// Daily revenue: one series, one colour, bars anchored to a zero baseline.
const RevenueChart = ({ series }) => {
  const [hover, setHover] = useState(null);
  const max = Math.max(...series.map((day) => day.revenue), 1);
  // Round the axis top up to a tidy number
  const magnitude = 10 ** Math.floor(Math.log10(max));
  const top = Math.ceil(max / magnitude) * magnitude;
  const ticks = [top, top / 2, 0];
  const active = hover != null ? series[hover] : null;
  const labelEvery = Math.ceil(series.length / 6);

  return (
    <figure>
      <div className="flex gap-3">
        <div className="flex h-56 flex-col justify-between text-right text-[0.6875rem] tabular-nums text-stone" aria-hidden="true">
          {ticks.map((tick) => (
            <span key={tick} className="-translate-y-1/2 last:translate-y-1/2">
              {compactNaira(tick)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          <div className="pointer-events-none absolute inset-0 flex flex-col justify-between" aria-hidden="true">
            <span className="border-t border-mist/70" />
            <span className="border-t border-mist/70" />
            <span className="border-t border-stone" />
          </div>

          <div className="relative flex h-56 items-end gap-[2px]" onMouseLeave={() => setHover(null)} role="img" aria-label={`Daily revenue for the last ${series.length} days. Full figures are in the table below.`}>
            {series.map((day, index) => (
              // The hit area is the full column height, so thin or empty days are still easy to point at
              <div
                key={day.date}
                className="flex h-full min-w-0 flex-1 items-end"
                onMouseEnter={() => setHover(index)}
                onFocus={() => setHover(index)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${formatDate(day.date, { day: 'numeric', month: 'short' })}: ${naira(day.revenue)}, ${day.orders} orders`}
              >
                <div
                  className={cx('w-full rounded-t-[3px] transition-colors', hover === index ? 'bg-ink' : hover == null ? 'bg-charcoal' : 'bg-stone')}
                  style={{ height: day.revenue ? `max(${(day.revenue / top) * 100}%, 2px)` : 0 }}
                />
              </div>
            ))}

            {active && (
              <div
                className="pointer-events-none absolute top-0 z-10 w-36 -translate-x-1/2 border border-mist bg-white p-2.5 text-[0.75rem] shadow-[0_6px_20px_rgba(0,0,0,0.08)]"
                style={{ left: `clamp(4.5rem, ${((hover + 0.5) / series.length) * 100}%, calc(100% - 4.5rem))` }}
              >
                <p className="text-graphite">{formatDate(active.date, { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                <p className="mt-1 text-sm font-semibold tabular-nums">{naira(active.revenue)}</p>
                <p className="text-graphite">
                  {active.orders} {active.orders === 1 ? 'order' : 'orders'}
                </p>
              </div>
            )}
          </div>

          <div className="mt-2 flex text-[0.6875rem] text-stone" aria-hidden="true">
            {series.map((day, index) => (
              <span key={day.date} className="min-w-0 flex-1 whitespace-nowrap">
                {index % labelEvery === 0 ? formatDate(day.date, { day: 'numeric', month: 'short' }) : ''}
              </span>
            ))}
          </div>
        </div>
      </div>

      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-[0.8125rem] text-graphite underline underline-offset-4">View as a table</summary>
        <div className="mt-3 max-h-64 overflow-y-auto border border-mist">
          <table className="w-full text-left text-[0.8125rem]">
            <thead className="sticky top-0 bg-white">
              <tr className="border-b border-mist">
                <th scope="col" className="px-3 py-2 font-medium">Date</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Orders</th>
                <th scope="col" className="px-3 py-2 text-right font-medium">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().map((day) => (
                <tr key={day.date} className="border-b border-mist last:border-0">
                  <td className="px-3 py-1.5">{formatDate(day.date)}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{day.orders}</td>
                  <td className="px-3 py-1.5 text-right tabular-nums">{naira(day.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
};

const Overview = () => {
  const { admin } = useAdmin();
  const [days, setDays] = useState(30);
  const { data, loading, error, reload } = useFetch('/admin/overview', { params: { days } });

  return (
    <>
      <PageHeader title={`Hello, ${admin.name.split(' ')[0]}.`} description="Here is how the store is doing.">
        <div className="flex border border-mist bg-white" role="group" aria-label="Time range">
          {RANGES.map((range) => (
            <button
              key={range.days}
              type="button"
              aria-pressed={days === range.days}
              onClick={() => setDays(range.days)}
              className={cx('px-3.5 py-2 text-[0.8125rem]', days === range.days ? 'bg-ink text-paper' : 'text-graphite hover:text-ink')}
            >
              {range.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {error && <ErrorNote error={error} onRetry={reload} />}
      {loading && !data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" role="status" aria-label="Loading overview">
          {[0, 1, 2, 3].map((tile) => (
            <div key={tile} className="skeleton h-32" />
          ))}
        </div>
      )}

      {data && (
        <div className={cx('space-y-6 transition-opacity', loading && 'opacity-60')}>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Stat label={`Revenue · last ${data.days} days`} value={naira(data.revenue)}>
              <Change current={data.revenue} previous={data.previousRevenue} />
            </Stat>
            <Stat label="Paid orders" value={data.orders}>
              <Change current={data.orders} previous={data.previousOrders} />
            </Stat>
            <Stat label="Average order" value={naira(data.averageOrder)} />
            <Stat label="Orders to send out" value={data.toFulfil} to="/admin/orders?status=PAID">
              <p className="mt-1 text-[0.8125rem] text-graphite">Paid and waiting for you</p>
            </Stat>
          </div>

          <Panel title="Revenue per day" description="Paid orders only. Point at a bar for the exact figure.">
            {data.revenue === 0 ? (
              <p className="py-10 text-center text-sm text-graphite">No sales in this period yet. Paid orders will appear here.</p>
            ) : (
              <RevenueChart series={data.series} />
            )}
          </Panel>

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Recent orders" action={<Link to="/admin/orders" className="link-underlined text-[0.8125rem]">All orders</Link>}>
              {data.recentOrders.length === 0 ? (
                <p className="text-sm text-graphite">No orders yet. They will show here as soon as customers check out.</p>
              ) : (
                <ul className="-my-2 divide-y divide-mist">
                  {data.recentOrders.map((order) => (
                    <li key={order.id}>
                      <Link to={`/admin/orders/${order.id}`} className="flex items-center gap-4 py-3 text-sm hover:bg-paper">
                        <span className="min-w-0 flex-1">
                          <span className="block font-medium">{order.orderNumber}</span>
                          <span className="block truncate text-[0.8125rem] text-graphite">
                            {order.fullName} · {formatDate(order.createdAt, { day: 'numeric', month: 'short' })}
                          </span>
                        </span>
                        <StatusBadge status={order.status} />
                        <span className="w-24 text-right tabular-nums">{naira(order.total)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <div className="space-y-6">
              <Panel title="Best sellers" description={`Units sold in the last ${data.days} days`}>
                {data.topProducts.length === 0 ? (
                  <p className="text-sm text-graphite">Nothing sold in this period yet.</p>
                ) : (
                  <ol className="space-y-3">
                    {data.topProducts.map((product) => (
                      <li key={product.name} className="text-sm">
                        <div className="flex justify-between gap-4">
                          <span className="truncate">{product.name}</span>
                          <span className="tabular-nums text-graphite">{product.units}</span>
                        </div>
                        <div className="mt-1.5 h-1 bg-bone">
                          <div className="h-full rounded-r-[2px] bg-charcoal" style={{ width: `${(product.units / data.topProducts[0].units) * 100}%` }} />
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Panel>

              <Panel title="Stock alerts">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <Link to="/admin/inventory?filter=low" className="border border-mist p-4 hover:border-ink">
                    <span className="display block text-3xl tabular-nums">{data.lowStock}</span>
                    <span className="text-graphite">Running low</span>
                  </Link>
                  <Link to="/admin/inventory?filter=out" className="border border-mist p-4 hover:border-ink">
                    <span className="display block text-3xl tabular-nums">{data.outOfStock}</span>
                    <span className="text-graphite">Sold out</span>
                  </Link>
                </div>
              </Panel>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button to="/admin/products/new">Add a product</Button>
            <Button variant="outline" to="/admin/homepage">
              Edit homepage
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default Overview;
