import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { CloseIcon } from '../../components/ui/Icons.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { cx } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { MediaField } from '../components/MediaUploader.jsx';
import { useProductOptions } from '../components/ProductPicker.jsx';
import { AdminTable, EmptyState, ErrorNote, PageHeader, Panel, SelectInput, StatusBadge, TextArea, TextInput, Toggle, useConfirm } from '../components/ui.jsx';

const LAYOUTS = [
  { value: 'FULL', label: 'Full width' },
  { value: 'WIDE', label: 'Wide (three-quarters)' },
  { value: 'TALL', label: 'Tall portrait' },
  { value: 'HALF', label: 'Half width' },
];

export const Lookbooks = () => {
  const navigate = useNavigate();
  const { data, loading, error, reload } = useFetch('/admin/lookbooks');

  const columns = [
    {
      key: 'title',
      header: 'Lookbook',
      render: (lookbook) => (
        <div className="flex items-center gap-3">
          <span className="flex gap-1">
            {[0, 1, 2].map((index) => {
              const item = lookbook.items[index];
              const src = item && (item.mediaType === 'VIDEO' ? item.posterUrl : item.mediaUrl);
              return (
                <span key={index} className="relative block aspect-[4/5] w-8 overflow-hidden bg-bone">
                  {src && <img src={resized(src, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
                </span>
              );
            })}
          </span>
          <span>
            <span className="block font-medium">{lookbook.title}</span>
            {lookbook.season && <span className="block text-[0.75rem] text-graphite">{lookbook.season}</span>}
          </span>
        </div>
      ),
    },
    { key: 'images', header: 'Images', align: 'right', render: (lookbook) => lookbook.items.length },
    { key: 'status', header: 'Status', render: (lookbook) => <StatusBadge status={lookbook.published ? 'PUBLISHED' : 'DRAFT'} /> },
  ];

  return (
    <>
      <PageHeader title="Lookbook" description="Editorial images and films, shown on the Lookbook page. Link the pieces worn in each image so shoppers can buy the look.">
        <Button to="/admin/lookbook/new">New lookbook</Button>
      </PageHeader>
      {error ? (
        <ErrorNote error={error} onRetry={reload} />
      ) : (
        <AdminTable
          caption="Lookbooks"
          columns={columns}
          rows={data || []}
          loading={loading}
          onRowClick={(lookbook) => navigate(`/admin/lookbook/${lookbook.id}`)}
          empty={
            <EmptyState title="No lookbooks yet." body="Create one to show a collection the way it was meant to be worn.">
              <Button to="/admin/lookbook/new">New lookbook</Button>
            </EmptyState>
          }
        />
      )}
    </>
  );
};

// ── One image in the lookbook, with its product markers ──────────────────

const LookItemEditor = ({ item, index, count, productOptions, onChange, onMove, onRemove }) => {
  const [placing, setPlacing] = useState(null); // productId whose marker is being placed
  const byId = new Map((productOptions || []).map((product) => [product.id, product]));
  const available = (productOptions || []).filter((product) => !item.products.some((link) => link.productId === product.id));
  const isImage = item.mediaType === 'IMAGE' && item.mediaUrl;

  const setProducts = (products) => onChange({ ...item, products });

  const place = (event) => {
    if (!placing) return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.round(((event.clientX - box.left) / box.width) * 1000) / 10;
    const y = Math.round(((event.clientY - box.top) / box.height) * 1000) / 10;
    setProducts(item.products.map((link) => (link.productId === placing ? { ...link, x, y } : link)));
    setPlacing(null);
  };

  return (
    <li className="border border-mist bg-white">
      <div className="flex items-center justify-between border-b border-mist px-4 py-2.5">
        <p className="text-sm font-semibold">Image {index + 1}</p>
        <div className="flex items-center gap-1 text-sm">
          <button type="button" onClick={() => onMove(-1)} disabled={index === 0} aria-label="Move earlier" className="border border-mist px-2 py-1 disabled:opacity-25">↑</button>
          <button type="button" onClick={() => onMove(1)} disabled={index === count - 1} aria-label="Move later" className="border border-mist px-2 py-1 disabled:opacity-25">↓</button>
          <button type="button" onClick={onRemove} className="ml-2 link-underlined text-[0.8125rem] text-danger">Remove</button>
        </div>
      </div>

      <div className="grid gap-6 p-4 md:grid-cols-[16rem_1fr]">
        <div>
          {isImage ? (
            <>
              {/* Click the photo to drop the marker for the chosen product. The whole,
                  uncropped photo is shown so the marker lands exactly where you click. */}
              <div
                className={cx('relative overflow-hidden bg-bone', placing && 'cursor-crosshair outline outline-2 outline-ink')}
                onClick={place}
              >
                <img src={resized(item.mediaUrl, 640)} alt="" className="block h-auto w-full" />
                {item.products.map((link, linkIndex) =>
                  link.x != null && link.y != null ? (
                    <span
                      key={link.productId}
                      className="absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-paper text-[0.625rem] font-semibold text-ink shadow"
                      style={{ left: `${link.x}%`, top: `${link.y}%` }}
                    >
                      {linkIndex + 1}
                    </span>
                  ) : null,
                )}
              </div>
              <button type="button" className="mt-2 link-underlined text-[0.8125rem]" onClick={() => onChange({ ...item, mediaUrl: '', posterUrl: '' })}>
                Replace image
              </button>
            </>
          ) : (
            <MediaField
              allowVideo
              aspect="aspect-[4/5]"
              value={item.mediaUrl ? { url: item.mediaUrl, type: item.mediaType, posterUrl: item.posterUrl } : null}
              onChange={(media) =>
                onChange({ ...item, mediaUrl: media?.url || '', mediaType: media?.type || 'IMAGE', posterUrl: media?.posterUrl || '' })
              }
            />
          )}
        </div>

        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <TextInput label="Caption" optional placeholder="e.g. Look 01 — The uniform" value={item.caption} onChange={(event) => onChange({ ...item, caption: event.target.value })} />
            <SelectInput label="Size on the page" value={item.layout} onChange={(event) => onChange({ ...item, layout: event.target.value })}>
              {LAYOUTS.map((layout) => (
                <option key={layout.value} value={layout.value}>{layout.label}</option>
              ))}
            </SelectInput>
          </div>

          <div>
            <p className="mb-1.5 text-[0.8125rem] font-medium">Pieces in this image</p>
            {item.products.length > 0 && (
              <ol className="mb-3 divide-y divide-mist border border-mist">
                {item.products.map((link, linkIndex) => (
                  <li key={link.productId} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                    <span className="flex size-5 items-center justify-center rounded-full bg-ink text-[0.625rem] font-semibold text-paper">{linkIndex + 1}</span>
                    <span className="min-w-0 flex-1 truncate">{byId.get(link.productId)?.name || 'Product'}</span>
                    {isImage && (
                      <button
                        type="button"
                        onClick={() => setPlacing(placing === link.productId ? null : link.productId)}
                        className={cx('border px-2.5 py-1 text-[0.75rem]', placing === link.productId ? 'border-ink bg-ink text-paper' : 'border-mist hover:border-ink')}
                      >
                        {placing === link.productId ? 'Now click the photo…' : link.x != null ? 'Move marker' : 'Place marker'}
                      </button>
                    )}
                    <button type="button" onClick={() => setProducts(item.products.filter((entry) => entry.productId !== link.productId))} aria-label="Remove piece" className="flex size-7 items-center justify-center">
                      <CloseIcon size={9} />
                    </button>
                  </li>
                ))}
              </ol>
            )}
            {item.products.length < 8 && (
              <select
                value=""
                onChange={(event) => event.target.value && setProducts([...item.products, { productId: event.target.value, x: null, y: null }])}
                aria-label="Add a piece to this image"
                className="block w-full max-w-sm border border-mist bg-white px-3 py-2.5 text-sm"
              >
                <option value="">+ Add a piece…</option>
                {available.map((product) => (
                  <option key={product.id} value={product.id}>{product.name}</option>
                ))}
              </select>
            )}
            <p className="mt-2 text-[0.8125rem] text-graphite">
              Markers are the numbered dots shoppers tap to “shop the look”. Pieces without a marker are still listed beside the image.
            </p>
          </div>
        </div>
      </div>
    </li>
  );
};

const BLANK_ITEM = { mediaUrl: '', mediaType: 'IMAGE', posterUrl: '', caption: '', layout: 'FULL', products: [] };

export const LookbookEditor = () => {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const toast = useToast();
  const confirm = useConfirm();
  const { data: lookbook, loading, error: loadError } = useFetch(isNew ? null : `/admin/lookbooks/${id}`);
  const { data: productOptions } = useProductOptions();
  const [form, setForm] = useState({ title: '', season: '', description: '', published: false, items: [] });
  const [titleError, setTitleError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = (saved) =>
    setForm({
      title: saved.title,
      slug: saved.slug,
      season: saved.season || '',
      description: saved.description || '',
      published: saved.published,
      items: saved.items.map((item) => ({
        id: item.id,
        mediaUrl: item.mediaUrl || '',
        mediaType: item.mediaType,
        posterUrl: item.posterUrl || '',
        caption: item.caption || '',
        layout: item.layout,
        products: item.products,
      })),
    });

  useEffect(() => {
    if (lookbook) load(lookbook);
  }, [lookbook]);

  const update = (changes) => setForm((current) => ({ ...current, ...changes }));
  const setItem = (index, item) => update({ items: form.items.map((entry, i) => (i === index ? item : entry)) });
  const moveItem = (index, delta) => {
    const items = [...form.items];
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    [items[index], items[target]] = [items[target], items[index]];
    update({ items });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setTitleError('Give the lookbook a title.');
    setTitleError('');
    setSaving(true);
    try {
      const saved = isNew ? await api.post('/admin/lookbooks', form) : await api.put(`/admin/lookbooks/${id}`, form);
      toast.success(form.published ? 'Saved — live on the Lookbook page.' : 'Saved as a draft.');
      if (isNew) navigate(`/admin/lookbook/${saved.id}`, { replace: true });
      else load(saved);
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    const yes = await confirm({
      title: `Delete “${form.title}”?`,
      body: 'The lookbook and its images are removed from your store. If the homepage “Shop the Look” uses one of these images, it will be hidden until you choose another. This can’t be undone.',
      confirmLabel: 'Delete lookbook',
      danger: true,
    });
    if (!yes) return;
    try {
      await api.delete(`/admin/lookbooks/${id}`);
      toast.success('Lookbook deleted.');
      navigate('/admin/lookbook');
    } catch (failure) {
      toast.error(failure.message);
    }
  };

  if (loadError) return <ErrorNote error={loadError} />;
  if (!isNew && loading) return <div className="skeleton h-96" role="status" aria-label="Loading lookbook" />;

  return (
    <form onSubmit={save}>
      <PageHeader
        title={isNew ? 'New lookbook' : form.title}
        back={<Link to="/admin/lookbook" className="link mb-3 inline-block text-[0.8125rem] text-graphite">← All lookbooks</Link>}
      >
        {form.published && !isNew && (
          <Button variant="outline" size="sm" href="/lookbook" target="_blank" rel="noreferrer">View in store</Button>
        )}
        <Button type="submit" loading={saving}>Save</Button>
      </PageHeader>

      <div className="space-y-6">
        <Panel title="Details">
          <div className="grid gap-5 md:grid-cols-2">
            <TextInput label="Title" placeholder="e.g. Foundation" value={form.title} error={titleError} onChange={(event) => update({ title: event.target.value })} />
            <TextInput label="Season or drop" optional placeholder="e.g. Drop 001" value={form.season} onChange={(event) => update({ season: event.target.value })} />
            <TextArea className="md:col-span-2" label="Introduction" optional rows={2} value={form.description} onChange={(event) => update({ description: event.target.value })} />
            <Toggle label="Show on the Lookbook page" description="Turn off to keep working on it privately." checked={form.published} onChange={(published) => update({ published })} />
          </div>
        </Panel>

        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-semibold">Images and films</h2>
              <p className="text-[0.8125rem] text-graphite">They appear on the page in this order. Mix sizes for an editorial feel.</p>
            </div>
          </div>
          {form.items.length === 0 ? (
            <div className="border border-dashed border-stone bg-white p-10 text-center">
              <p className="display text-2xl">No images yet.</p>
              <p className="mt-2 text-sm text-graphite">Add your first image or film to begin.</p>
            </div>
          ) : (
            <ol className="space-y-4">
              {form.items.map((item, index) => (
                <LookItemEditor
                  key={item.id || `new-${index}`}
                  item={item}
                  index={index}
                  count={form.items.length}
                  productOptions={productOptions}
                  onChange={(next) => setItem(index, next)}
                  onMove={(delta) => moveItem(index, delta)}
                  onRemove={() => update({ items: form.items.filter((_, i) => i !== index) })}
                />
              ))}
            </ol>
          )}
          {form.items.length < 40 && (
            <Button variant="outline" className="mt-4" onClick={() => update({ items: [...form.items, { ...BLANK_ITEM }] })}>
              + Add an image or film
            </Button>
          )}
        </section>

        {!isNew && (
          <button type="button" onClick={remove} className="link-underlined text-[0.8125rem] text-danger">Delete this lookbook</button>
        )}
      </div>
    </form>
  );
};
