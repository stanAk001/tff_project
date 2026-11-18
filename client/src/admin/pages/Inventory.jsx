import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebounced } from '../../hooks/useUi.js';
import { api } from '../../services/api.js';
import { cx } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { AdminTable, EmptyState, ErrorNote, PageHeader, SearchInput, TablePagination, Tabs } from '../components/ui.jsx';

// An editable stock number. Saves when you press Enter or click away.
const StockCell = ({ variant, onSaved }) => {
  const toast = useToast();
  const [value, setValue] = useState(String(variant.stock));
  const [saving, setSaving] = useState(false);
  const changed = value !== String(variant.stock);

  const save = async () => {
    const stock = Number(value);
    if (!changed) return;
    if (value === '' || !Number.isInteger(stock) || stock < 0) {
      toast.error('Stock must be a whole number, 0 or more.');
      setValue(String(variant.stock));
      return;
    }
    setSaving(true);
    try {
      const result = await api.patch(`/admin/inventory/${variant.id}`, { stock });
      toast.success(
        result.notified
          ? `Stock updated. ${result.notified} waiting ${result.notified === 1 ? 'customer was' : 'customers were'} emailed.`
          : 'Stock updated.',
      );
      onSaved();
    } catch (failure) {
      toast.error(failure.message);
      setValue(String(variant.stock));
    } finally {
      setSaving(false);
    }
  };

  return (
    <input
      type="number"
      min="0"
      inputMode="numeric"
      value={value}
      disabled={saving}
      onChange={(event) => setValue(event.target.value)}
      onBlur={save}
      onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
      aria-label={`Stock for ${variant.product.name}, ${variant.colour} ${variant.size}`}
      className={cx('w-20 border px-2 py-1.5 text-right tabular-nums focus:border-ink focus:outline-none', changed ? 'border-ink' : 'border-mist')}
    />
  );
};

export const Inventory = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const filter = searchParams.get('filter') || 'all';
  const page = Number(searchParams.get('page')) || 1;
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());

  const { data, meta, loading, error, reload } = useFetch('/admin/inventory', {
    params: { filter, page, limit: 50, ...(q && { q }) },
    paged: true,
  });

  const threshold = meta?.lowStockThreshold ?? 3;
  const level = (stock) => (stock === 0 ? 'out' : stock <= threshold ? 'low' : 'ok');

  const columns = [
    {
      key: 'product',
      header: 'Product',
      render: (variant) => (
        <div className="flex items-center gap-3">
          <span className="relative block aspect-[4/5] w-9 shrink-0 overflow-hidden bg-bone">
            {variant.imageUrl && <img src={resized(variant.imageUrl, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
          </span>
          <span className="min-w-0">
            <Link to={`/admin/products/${variant.product.id}`} className="block truncate font-medium hover:underline">
              {variant.product.name}
            </Link>
            {variant.product.status === 'DRAFT' && <span className="text-[0.75rem] text-stone">Draft</span>}
          </span>
        </div>
      ),
    },
    {
      key: 'variant',
      header: 'Colour / size',
      render: (variant) => (
        <span className="flex items-center gap-2 whitespace-nowrap">
          <span className="size-3 rounded-full border border-mist" style={{ backgroundColor: variant.colourHex }} />
          {variant.colour} / {variant.size}
        </span>
      ),
    },
    { key: 'sku', header: 'Code', render: (variant) => <span className="text-[0.8125rem] text-graphite">{variant.sku || '—'}</span> },
    {
      key: 'level',
      header: 'Level',
      render: (variant) => {
        const state = level(variant.stock);
        return (
          <span className={cx('whitespace-nowrap text-[0.8125rem] font-medium', state === 'out' ? 'text-danger' : state === 'low' ? 'text-ink' : 'text-graphite')}>
            {state === 'out' ? 'Out of stock' : state === 'low' ? `Low stock — ${variant.stock} left` : 'In stock'}
            {variant.waiting > 0 && <span className="ml-2 font-normal text-graphite">· {variant.waiting} waiting</span>}
          </span>
        );
      },
    },
    { key: 'stock', header: 'In stock', align: 'right', render: (variant) => <StockCell key={`${variant.id}-${variant.stock}`} variant={variant} onSaved={reload} /> },
  ];

  const go = (next) => setSearchParams(next);

  return (
    <>
      <PageHeader
        title="Inventory"
        description="Stock for every colour and size. Type a new number and press Enter to save. Customers can never buy more than you have."
      />

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Tabs
          value={filter}
          onChange={(value) => go(value === 'all' ? {} : { filter: value })}
          tabs={[
            { value: 'all', label: 'All' },
            { value: 'low', label: 'Low stock', count: meta?.lowCount },
            { value: 'out', label: 'Out of stock', count: meta?.outCount },
          ]}
        />
        <SearchInput value={query} onChange={setQuery} placeholder="Search product or code" />
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <AdminTable
            caption="Inventory"
            columns={columns}
            rows={data || []}
            loading={loading}
            empty={
              filter === 'low' ? (
                <EmptyState title="Nothing is running low." body={`Items appear here when ${threshold} or fewer are left. Change that number in Settings.`} />
              ) : filter === 'out' ? (
                <EmptyState title="Nothing is sold out." />
              ) : (
                <EmptyState title="No stock to show." body="Add a product and its sizes will appear here." />
              )
            }
          />
          <TablePagination meta={meta} onChange={(next) => go({ ...(filter !== 'all' && { filter }), page: String(next) })} />
        </>
      )}
    </>
  );
};
