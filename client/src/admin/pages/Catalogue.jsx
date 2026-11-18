import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { CloseIcon } from '../../components/ui/Icons.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { dropLabel, formatDate } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { MediaField } from '../components/MediaUploader.jsx';
import ProductPicker, { useProductOptions } from '../components/ProductPicker.jsx';
import { AdminTable, EmptyState, ErrorNote, Field, PageHeader, Panel, SelectInput, StatusBadge, Tabs, TextArea, TextInput, Toggle, useConfirm } from '../components/ui.jsx';

// ═════════════════════════════════════════════════════════════════════════
// Categories
// ═════════════════════════════════════════════════════════════════════════

const DEFAULT_GUIDE = { unit: 'cm', columns: ['Size', 'Chest', 'Length'], rows: [['S', '', ''], ['M', '', ''], ['L', '', ''], ['XL', '', '']] };

// A small spreadsheet for the size guide shoppers see on product pages
const SizeGuideEditor = ({ guide, onChange }) => {
  if (!guide) {
    return (
      <div className="border border-dashed border-stone p-5 text-center">
        <p className="text-sm text-graphite">No size guide for this category.</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => onChange(DEFAULT_GUIDE)}>
          Add a size guide
        </Button>
      </div>
    );
  }

  const setColumn = (index, value) => onChange({ ...guide, columns: guide.columns.map((column, i) => (i === index ? value : column)) });
  const setCell = (rowIndex, cellIndex, value) =>
    onChange({ ...guide, rows: guide.rows.map((row, r) => (r === rowIndex ? guide.columns.map((_, c) => (c === cellIndex ? value : row[c] || '')) : row)) });
  const cell = 'w-full min-w-16 border border-mist px-2 py-1.5 text-sm focus:border-ink focus:outline-none';

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              {guide.columns.map((column, index) => (
                <th key={index} className="p-0.5">
                  <input value={column} onChange={(event) => setColumn(index, event.target.value)} aria-label={`Column ${index + 1} heading`} className={`${cell} font-semibold`} />
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {guide.rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {guide.columns.map((column, cellIndex) => (
                  <td key={cellIndex} className="p-0.5">
                    <input value={row[cellIndex] || ''} onChange={(event) => setCell(rowIndex, cellIndex, event.target.value)} aria-label={`${column}, row ${rowIndex + 1}`} className={cell} />
                  </td>
                ))}
                <td>
                  <button type="button" onClick={() => onChange({ ...guide, rows: guide.rows.filter((_, r) => r !== rowIndex) })} aria-label={`Remove row ${rowIndex + 1}`} className="flex size-8 items-center justify-center text-graphite hover:text-danger">
                    <CloseIcon size={9} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-[0.8125rem]">
        <button type="button" className="link-underlined" onClick={() => onChange({ ...guide, rows: [...guide.rows, guide.columns.map(() => '')] })}>+ Add a size</button>
        {guide.columns.length < 8 && (
          <button type="button" className="link-underlined" onClick={() => onChange({ ...guide, columns: [...guide.columns, 'Measurement'] })}>+ Add a measurement</button>
        )}
        {guide.columns.length > 2 && (
          <button type="button" className="link-underlined" onClick={() => onChange({ ...guide, columns: guide.columns.slice(0, -1), rows: guide.rows.map((row) => row.slice(0, guide.columns.length - 1)) })}>Remove last measurement</button>
        )}
        <label className="flex items-center gap-2">
          Measured in
          <select value={guide.unit} onChange={(event) => onChange({ ...guide, unit: event.target.value })} className="border border-mist bg-white px-2 py-1">
            <option value="cm">centimetres</option>
            <option value="in">inches</option>
          </select>
        </label>
        <button type="button" className="link-underlined text-danger" onClick={() => onChange(null)}>Remove size guide</button>
      </div>
    </div>
  );
};

const CategoryForm = ({ category, onClose, onSaved }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: category?.name || '',
    description: category?.description || '',
    imageUrl: category?.imageUrl || '',
    sizeGuide: category?.sizeGuide || null,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const save = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Give the category a name.');
    setSaving(true);
    setError('');
    try {
      // Keep the web address stable when renaming isn't the point
      const payload = { ...form, slug: category?.slug || '' };
      if (category) await api.put(`/admin/categories/${category.id}`, payload);
      else await api.post('/admin/categories', payload);
      toast.success(category ? 'Category saved.' : 'Category added.');
      onSaved();
    } catch (failure) {
      setError(failure.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="space-y-6 px-5 py-6 md:px-8">
      <TextInput label="Name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="e.g. Hoodies" error={error} />
      <TextArea label="Short description" optional rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} />
      <MediaField
        label="Category image"
        hint="Shown on the homepage. A tall (portrait) photo works best."
        value={form.imageUrl ? { url: form.imageUrl, type: 'IMAGE' } : null}
        onChange={(media) => setForm({ ...form, imageUrl: media?.url || '' })}
      />
      <Field label="Size guide" hint="Shoppers see this when they tap “Size guide” on any product in this category.">
        <SizeGuideEditor guide={form.sizeGuide} onChange={(sizeGuide) => setForm({ ...form, sizeGuide })} />
      </Field>
      <div className="flex justify-end gap-3 border-t border-mist pt-6">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button type="submit" loading={saving}>{category ? 'Save category' : 'Add category'}</Button>
      </div>
    </form>
  );
};

export const Categories = () => {
  const toast = useToast();
  const confirm = useConfirm();
  const { data: categories, loading, error, reload, setData } = useFetch('/admin/categories');
  const [editing, setEditing] = useState(null); // category | 'new' | null

  const move = async (index, delta) => {
    const next = [...categories];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData(next);
    try {
      await api.put('/admin/categories/order', { ids: next.map((category) => category.id) });
    } catch (failure) {
      toast.error(failure.message);
      reload();
    }
  };

  const remove = async (category) => {
    const yes = await confirm({
      title: `Delete the ${category.name} category?`,
      body: category.productCount
        ? `Its ${category.productCount} ${category.productCount === 1 ? 'product stays' : 'products stay'} in your store but will have no category until you choose a new one.`
        : 'This category has no products in it.',
      confirmLabel: 'Delete category',
      danger: true,
    });
    if (!yes) return;
    try {
      await api.delete(`/admin/categories/${category.id}`);
      toast.success('Category deleted.');
      reload();
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Category',
      render: (category) => (
        <div className="flex items-center gap-3">
          <span className="relative block aspect-[4/5] w-10 shrink-0 overflow-hidden bg-bone">
            {category.imageUrl && <img src={resized(category.imageUrl, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
          </span>
          <span className="font-medium">{category.name}</span>
        </div>
      ),
    },
    { key: 'products', header: 'Products', align: 'right', render: (category) => category.productCount },
    { key: 'guide', header: 'Size guide', render: (category) => (category.sizeGuide ? 'Yes' : <span className="text-stone">None</span>) },
    {
      key: 'order',
      header: 'Order',
      render: (category) => {
        const index = categories.indexOf(category);
        return (
          <div className="flex gap-1" onClick={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${category.name} up`} className="border border-mist px-2 py-1 disabled:opacity-25">↑</button>
            <button type="button" onClick={() => move(index, 1)} disabled={index === categories.length - 1} aria-label={`Move ${category.name} down`} className="border border-mist px-2 py-1 disabled:opacity-25">↓</button>
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: <span className="sr-only">Actions</span>,
      align: 'right',
      render: (category) => (
        <button type="button" className="link-underlined text-[0.8125rem] text-danger" onClick={(event) => { event.stopPropagation(); remove(category); }}>
          Delete
        </button>
      ),
    },
  ];

  return (
    <>
      <PageHeader title="Categories" description="The types of clothing you sell. They appear in the menu, the shop filters and on the homepage, in this order.">
        <Button onClick={() => setEditing('new')}>Add category</Button>
      </PageHeader>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <AdminTable
          caption="Categories"
          columns={columns}
          rows={categories || []}
          loading={loading}
          onRowClick={setEditing}
          empty={
            <EmptyState title="No categories yet." body="Add categories like T-Shirts, Hoodies or Accessories.">
              <Button onClick={() => setEditing('new')}>Add category</Button>
            </EmptyState>
          }
        />
      )}
      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? 'Add category' : 'Edit category'} className="sm:max-w-[36rem]">
        {editing && (
          <CategoryForm
            key={editing === 'new' ? 'new' : editing.id}
            category={editing === 'new' ? null : editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); reload(); }}
          />
        )}
      </Modal>
    </>
  );
};

// ═════════════════════════════════════════════════════════════════════════
// Collections & drops
// ═════════════════════════════════════════════════════════════════════════

export const Collections = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') || 'all';
  const { data, loading, error, reload } = useFetch('/admin/collections');
  const rows = (data || []).filter((collection) => (view === 'drops' ? collection.isDrop : view === 'collections' ? !collection.isDrop : true));

  const columns = [
    {
      key: 'name',
      header: 'Name',
      render: (collection) => (
        <div className="flex items-center gap-3">
          <span className="relative block aspect-[4/5] w-10 shrink-0 overflow-hidden bg-bone">
            {collection.coverImageUrl && <img src={resized(collection.coverImageUrl, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
          </span>
          <span>
            <span className="block font-medium">{collection.name}</span>
            <span className="block text-[0.75rem] text-graphite">{dropLabel(collection) || 'Collection'}</span>
          </span>
        </div>
      ),
    },
    { key: 'status', header: 'Status', render: (collection) => <StatusBadge status={collection.published ? collection.status : 'DRAFT'} label={collection.published ? undefined : 'Hidden'} /> },
    { key: 'launch', header: 'Launch date', render: (collection) => (collection.launchDate ? formatDate(collection.launchDate) : '—') },
    { key: 'products', header: 'Products', align: 'right', render: (collection) => collection.productCount },
  ];

  return (
    <>
      <PageHeader title="Collections & drops" description="Group products into collections, or release them as a numbered, limited drop with a launch date.">
        <Button to="/admin/collections/new">New collection or drop</Button>
      </PageHeader>
      <div className="mb-4">
        <Tabs
          value={view}
          onChange={(value) => setSearchParams(value === 'all' ? {} : { view: value })}
          tabs={[{ value: 'all', label: 'All' }, { value: 'drops', label: 'Drops' }, { value: 'collections', label: 'Collections' }]}
        />
      </div>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <AdminTable
          caption="Collections"
          columns={columns}
          rows={rows}
          loading={loading}
          onRowClick={(collection) => navigate(`/admin/collections/${collection.id}`)}
          empty={
            <EmptyState title="Nothing here yet." body="Create a collection to group pieces, or a drop to build anticipation for a launch.">
              <Button to="/admin/collections/new">New collection or drop</Button>
            </EmptyState>
          }
        />
      )}
    </>
  );
};

const BLANK_COLLECTION = {
  name: '', slug: '', description: '', coverImageUrl: '', coverVideoUrl: '', launchDate: '', status: 'ACTIVE',
  isDrop: false, dropNumber: '', featured: false, published: true, seoTitle: '', seoDescription: '', productIds: [],
};

// <input type="datetime-local"> wants local time without a timezone
const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const CollectionEditor = () => {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: collection, loading, error: loadError } = useFetch(isNew ? null : `/admin/collections/${id}`);
  const { data: productOptions } = useProductOptions();
  const [form, setForm] = useState(BLANK_COLLECTION);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!collection) return;
    setForm({
      ...BLANK_COLLECTION,
      ...Object.fromEntries(Object.entries(collection).map(([k, v]) => [k, v ?? ''])),
      launchDate: toLocalInput(collection.launchDate),
      productIds: collection.productIds,
    });
  }, [collection]);

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));
  const bind = (name) => ({ value: form[name], error: errors[name], onChange: (event) => update({ [name]: event.target.value }) });

  const save = async (event) => {
    event.preventDefault();
    const problems = {};
    if (!form.name.trim()) problems.name = 'Give it a name.';
    if (form.status === 'UPCOMING' && !form.launchDate) problems.launchDate = 'Choose when it launches, so the countdown can run.';
    setErrors(problems);
    if (Object.keys(problems).length) return;

    setSaving(true);
    try {
      const payload = {
        ...form,
        launchDate: form.launchDate ? new Date(form.launchDate).toISOString() : null,
        dropNumber: form.isDrop && form.dropNumber ? Number(form.dropNumber) : null,
      };
      const saved = isNew ? await api.post('/admin/collections', payload) : await api.put(`/admin/collections/${id}`, payload);
      toast.success('Saved.');
      if (isNew) navigate(`/admin/collections/${saved.id}`, { replace: true });
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: `Delete ${form.name}?`,
      body: 'The collection is removed from your store. The products in it are not deleted. To keep it but hide it, set its status to Archived instead.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!yes) return;
    try {
      await api.delete(`/admin/collections/${id}`);
      toast.success('Collection deleted.');
      navigate('/admin/collections');
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  if (loadError) return <ErrorNote error={loadError} />;
  if (!isNew && loading) return <div className="skeleton h-96" role="status" aria-label="Loading collection" />;

  const cover = form.coverVideoUrl
    ? { url: form.coverVideoUrl, type: 'VIDEO', posterUrl: form.coverImageUrl }
    : form.coverImageUrl
      ? { url: form.coverImageUrl, type: 'IMAGE' }
      : null;

  return (
    <form onSubmit={save}>
      <PageHeader
        title={isNew ? 'New collection or drop' : form.name}
        back={<Link to="/admin/collections" className="link mb-3 inline-block text-[0.8125rem] text-graphite">← All collections</Link>}
      >
        {!isNew && collection?.published && (
          <Button variant="outline" size="sm" href={`/collections/${collection.slug}`} target="_blank" rel="noreferrer">View in store</Button>
        )}
        <Button type="submit" loading={saving}>Save</Button>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-6">
          <Panel title="Details">
            <div className="space-y-5">
              <TextInput label="Name" placeholder="e.g. Drop 003 — Night Shift" {...bind('name')} />
              <TextArea label="Description" optional rows={3} hint="A sentence or two about the idea behind it." {...bind('description')} />
            </div>
          </Panel>

          <Panel title="Products" description="Choose the pieces in this collection and put them in the order you want using the arrows.">
            <ProductPicker value={form.productIds} onChange={(productIds) => update({ productIds })} options={productOptions} max={200} />
            {form.status === 'UPCOMING' && (
              <p className="mt-4 border border-mist bg-paper p-3 text-[0.8125rem] text-graphite">
                While a drop is upcoming, its collection page hides these pieces and shows the countdown. To keep them out of the main shop too, leave the products as drafts and publish them on launch day.
              </p>
            )}
          </Panel>

          <details className="border border-mist bg-white">
            <summary className="cursor-pointer px-5 py-4 text-sm font-semibold md:px-6">More options <span className="font-normal text-graphite">— Google listing</span></summary>
            <div className="grid gap-5 border-t border-mist p-5 sm:grid-cols-2 md:p-6">
              <TextInput label="Title on Google" optional {...bind('seoTitle')} />
              <TextArea label="Description on Google" optional rows={2} {...bind('seoDescription')} />
            </div>
          </details>

          {!isNew && (
            <button type="button" onClick={remove} className="link-underlined text-[0.8125rem] text-danger">Delete this collection</button>
          )}
        </div>

        <div className="space-y-6">
          <Panel title="Status">
            <div className="space-y-5">
              <SelectInput label="Stage" hint={{ UPCOMING: 'Shows “Coming soon” with a countdown. It goes live by itself at the launch date.', ACTIVE: 'Live and shoppable.', ARCHIVED: 'Kept as a past drop; still viewable.' }[form.status]} {...bind('status')}>
                <option value="UPCOMING">Upcoming</option>
                <option value="ACTIVE">Active</option>
                <option value="ARCHIVED">Archived</option>
              </SelectInput>
              <TextInput label="Launch date and time" optional={form.status !== 'UPCOMING'} type="datetime-local" {...bind('launchDate')} />
              <Toggle label="Visible in the store" description="Turn off to hide it completely." checked={form.published} onChange={(published) => update({ published })} />
              <Toggle label="Feature this" description="Listed first on the collections page." checked={form.featured} onChange={(featured) => update({ featured })} />
            </div>
          </Panel>

          <Panel title="Limited drop">
            <div className="space-y-5">
              <Toggle label="This is a numbered drop" description="Shows a label like “Drop 003”." checked={form.isDrop} onChange={(isDrop) => update({ isDrop })} />
              {form.isDrop && <TextInput label="Drop number" type="number" min="1" placeholder="3" {...bind('dropNumber')} />}
            </div>
          </Panel>

          <Panel title="Cover">
            <MediaField
              allowVideo
              aspect="aspect-[4/5]"
              hint="An image or a short video. Shown at the top of the collection page."
              value={cover}
              onChange={(media) =>
                update(
                  !media
                    ? { coverImageUrl: '', coverVideoUrl: '' }
                    : media.type === 'VIDEO'
                      ? { coverVideoUrl: media.url, coverImageUrl: media.posterUrl || form.coverImageUrl }
                      : { coverImageUrl: media.url, coverVideoUrl: '' },
                )
              }
            />
          </Panel>
        </div>
      </div>
    </form>
  );
};
