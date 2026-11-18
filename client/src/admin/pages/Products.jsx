import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { useDebounced } from '../../hooks/useUi.js';
import { api } from '../../services/api.js';
import { naira } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { AdminTable, EmptyState, ErrorNote, PageHeader, SearchInput, StatusBadge, TablePagination, Tabs, useConfirm } from '../components/ui.jsx';

const TABS = [
  { value: '', label: 'Active' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const Products = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';
  const page = Number(searchParams.get('page')) || 1;
  const [query, setQuery] = useState('');
  const q = useDebounced(query.trim());

  const { data, meta, loading, error, reload } = useFetch('/admin/products', {
    params: { page, limit: 20, ...(status && { status }), ...(q && { q }) },
    paged: true,
  });

  const setStatus = async (product, next, message) => {
    try {
      await api.patch(`/admin/products/${product.id}/status`, { status: next });
      toast.success(message);
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const archive = async (product) => {
    const yes = await confirm({
      title: `Archive ${product.name}?`,
      body: 'It will be removed from the store but kept here, along with its order history. You can restore it at any time.',
      confirmLabel: 'Archive',
    });
    if (yes) setStatus(product, 'ARCHIVED', 'Product archived.');
  };

  const remove = async (product) => {
    const yes = await confirm({
      title: `Delete ${product.name} for good?`,
      body: 'This permanently removes the product, its photos and its stock records. Past orders keep their details. This can’t be undone — archive instead if you might want it back.',
      confirmLabel: 'Delete permanently',
      danger: true,
    });
    if (!yes) return;
    try {
      await api.delete(`/admin/products/${product.id}`);
      toast.success('Product deleted.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Product',
      render: (product) => (
        <div className="flex items-center gap-3">
          <span className="relative block aspect-[4/5] w-10 shrink-0 overflow-hidden bg-bone">
            {product.images[0] && <img src={resized(product.images[0].url, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-medium">{product.name}</span>
            <span className="block text-[0.75rem] text-graphite">{product.category?.name || 'No category'}</span>
          </span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (product) => <StatusBadge status={product.status} /> },
    {
      key: 'stock',
      header: 'In stock',
      align: 'right',
      render: (product) =>
        product.totalStock === 0 ? <span className="text-danger">Sold out</span> : `${product.totalStock} across ${product.variantCount}`,
    },
    { key: 'price', header: 'Price', align: 'right', render: (product) => naira(product.price) },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (product) => (
        <div className="flex justify-end gap-4 text-[0.8125rem]" onClick={(event) => event.stopPropagation()}>
          {product.status === 'DRAFT' && product.images.length > 0 && (
            <button type="button" className="link-underlined" onClick={() => setStatus(product, 'PUBLISHED', 'Product published — it is now in the store.')}>
              Publish
            </button>
          )}
          {product.status === 'PUBLISHED' && (
            <button type="button" className="link-underlined" onClick={() => setStatus(product, 'DRAFT', 'Product hidden from the store.')}>
              Unpublish
            </button>
          )}
          {product.status === 'ARCHIVED' ? (
            <>
              <button type="button" className="link-underlined" onClick={() => setStatus(product, 'DRAFT', 'Product restored as a draft.')}>
                Restore
              </button>
              <button type="button" className="link-underlined text-danger" onClick={() => remove(product)}>
                Delete
              </button>
            </>
          ) : (
            <button type="button" className="link-underlined" onClick={() => archive(product)}>
              Archive
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Products" description="Everything you sell. Click a product to edit it.">
        <Button to="/admin/products/new">Add product</Button>
      </PageHeader>

      <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <Tabs tabs={TABS} value={status} onChange={(value) => setSearchParams(value ? { status: value } : {})} />
        <SearchInput value={query} onChange={setQuery} placeholder="Search by name or SKU" />
      </div>

      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <>
          <AdminTable
            caption="Products"
            columns={columns}
            rows={data || []}
            loading={loading}
            onRowClick={(product) => navigate(`/admin/products/${product.id}`)}
            empty={
              q ? (
                <EmptyState title="No products found." body={`Nothing matches “${q}”.`} />
              ) : status === 'ARCHIVED' ? (
                <EmptyState title="Nothing archived." body="Archived products are kept here, out of the store." />
              ) : (
                <EmptyState title="No products yet." body="Add your first piece — it only takes a few minutes.">
                  <Button to="/admin/products/new">Add product</Button>
                </EmptyState>
              )
            }
          />
          <TablePagination meta={meta} onChange={(next) => setSearchParams({ ...(status && { status }), page: String(next) })} />
        </>
      )}
      <p className="mt-6 text-[0.8125rem] text-graphite">
        Looking for stock levels? <Link to="/admin/inventory" className="link-underlined text-ink">Go to Inventory</Link>
      </p>
    </>
  );
};

export default Products;
