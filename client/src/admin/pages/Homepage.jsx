import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { ChevronIcon } from '../../components/ui/Icons.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { cx } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { MediaField } from '../components/MediaUploader.jsx';
import ProductPicker, { useProductOptions } from '../components/ProductPicker.jsx';
import { ErrorNote, Field, PageHeader, SelectInput, TextArea, TextInput, Toggle } from '../components/ui.jsx';

// What each homepage section is, in the owner's words, and which controls it has.
const SECTIONS = {
  HERO: {
    name: 'Hero',
    about: 'The full-screen opening image or film.',
    fields: ['eyebrow', 'heading', 'subheading', 'media', 'cta', 'cta2'],
  },
  MANIFESTO: {
    name: 'Brand statement',
    about: 'A film plays inside one huge word, opens to full screen, then your statement appears one sentence at a time.',
    fields: ['eyebrow', 'keyword', 'statement', 'caption', 'proof', 'media', 'cta'],
  },
  NEW_DROP: {
    name: 'New drop',
    about: 'Introduces your latest release with up to four pieces.',
    fields: ['eyebrow', 'heading', 'body', 'cta', 'products'],
    maxProducts: 4,
  },
  CATEGORIES: {
    name: 'Shop by category',
    about: 'A row of your categories. Manage them, and their images, under Categories.',
    fields: ['eyebrow', 'heading'],
    manage: { to: '/admin/categories', label: 'Manage categories' },
  },
  FEATURED_PRODUCTS: {
    name: 'Featured products',
    about: 'A hand-picked selection of pieces.',
    fields: ['eyebrow', 'heading', 'cta', 'products'],
    maxProducts: 12,
  },
  FEATURED_COLLECTION: {
    name: 'Featured collection',
    about: 'Spotlights one collection or drop. Upcoming drops show a live countdown.',
    fields: ['collection', 'ctaLabel'],
  },
  EDITORIAL: {
    name: 'Brand story',
    about: 'A large image beside a few lines about TFF.',
    fields: ['eyebrow', 'heading', 'body', 'media', 'cta'],
  },
  SHOP_THE_LOOK: {
    name: 'Shop the look',
    about: 'One lookbook image with markers on the pieces being worn.',
    fields: ['eyebrow', 'heading', 'body', 'look'],
    manage: { to: '/admin/lookbook', label: 'Manage lookbook images and markers' },
  },
  CAMPAIGN_BANNER: {
    name: 'Campaign banner',
    about: 'A wide image or film with a short statement.',
    fields: ['heading', 'subheading', 'media', 'cta'],
  },
  LOOKBOOK: {
    name: 'Lookbook preview',
    about: 'Shows the first images of your newest published lookbook.',
    fields: ['eyebrow', 'heading', 'ctaLabel'],
    manage: { to: '/admin/lookbook', label: 'Manage lookbooks' },
  },
  NEWSLETTER: {
    name: 'Newsletter signup',
    about: 'Invites visitors to join your email list.',
    fields: ['heading', 'body'],
  },
};

// Pick a destination from a list instead of typing a web address
const LinkField = ({ label, value, onChange, destinations }) => {
  const known = destinations.some((destination) => destination.href === value);
  const [custom, setCustom] = useState(Boolean(value) && !known);
  return (
    <Field label={label}>
      <select
        value={custom ? '__custom' : value || ''}
        onChange={(event) => {
          if (event.target.value === '__custom') setCustom(true);
          else {
            setCustom(false);
            onChange(event.target.value);
          }
        }}
        className="block w-full border border-mist bg-white px-3 py-2.5"
        aria-label={label}
      >
        <option value="">Choose a page…</option>
        {destinations.map((destination) => (
          <option key={destination.href} value={destination.href}>
            {destination.label}
          </option>
        ))}
        <option value="__custom">Another page (type the address)</option>
      </select>
      {custom && (
        <input
          value={value || ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder="/shop?category=hoodies"
          aria-label={`${label} address`}
          className="mt-2 block w-full border border-mist bg-white px-3 py-2.5 placeholder:text-stone focus:border-ink focus:outline-none"
        />
      )}
    </Field>
  );
};

const SectionEditor = ({ section, lookups, onSaved }) => {
  const toast = useToast();
  const config = SECTIONS[section.type];
  const [content, setContent] = useState(section.content || {});
  const [productIds, setProductIds] = useState(section.productIds);
  const [collectionIds, setCollectionIds] = useState(section.collectionIds);
  const [saving, setSaving] = useState(false);
  const has = (field) => config.fields.includes(field);
  const set = (changes) => setContent((current) => ({ ...current, ...changes }));
  const text = (name) => ({ value: content[name] || '', onChange: (event) => set({ [name]: event.target.value }) });

  const save = async () => {
    setSaving(true);
    try {
      onSaved(await api.put(`/admin/homepage/${section.id}`, { enabled: section.enabled, content, productIds, collectionIds }));
      toast.success(`${config.name} saved${section.enabled ? ' — live on the homepage.' : '.'}`);
    } catch (failure) {
      toast.error(failure.message);
    } finally {
      setSaving(false);
    }
  };

  const media = content.mediaUrl ? { url: content.mediaUrl, type: content.mediaType || 'IMAGE', posterUrl: content.posterUrl } : null;

  return (
    <div className="space-y-5 border-t border-mist p-5 md:p-6">
      <div className="grid gap-5 md:grid-cols-2">
        {has('eyebrow') && <TextInput label="Small label" optional placeholder="e.g. New drop" {...text('eyebrow')} />}
        {has('heading') && <TextInput label="Heading" {...text('heading')} />}
        {has('subheading') && <TextInput label="Line under the heading" optional {...text('subheading')} />}
        {has('body') && <TextArea className="md:col-span-2" label="Text" optional rows={3} {...text('body')} />}
        {has('keyword') && (
          <TextInput
            label="Big word"
            optional
            maxLength={10}
            placeholder="e.g. Fewer"
            hint="The film plays inside this word. One short word works best; leave blank to use the statement's first word."
            {...text('keyword')}
          />
        )}
        {has('statement') && (
          <TextArea
            className="md:col-span-2"
            label="Statement"
            rows={3}
            hint="Each sentence becomes its own title card. Two to four short sentences work best."
            {...text('heading')}
          />
        )}
        {has('caption') && <TextInput label="Small caption" optional placeholder="e.g. Designed in Lagos" {...text('body')} />}
        {has('proof') && (
          <div className="md:col-span-2">
            <Toggle
              label="Show live proof"
              description="Under the first line, every published piece appears as a small photo with the real count. At the end, the current drop's real stock left is shown with a Shop the drop button. Both update by themselves."
              checked={content.showProof !== false}
              onChange={(showProof) => set({ showProof })}
            />
          </div>
        )}
      </div>

      {has('media') && (
        <div className="max-w-md">
          <MediaField
            label="Image or video"
            hint="Landscape works best on computers; keep the subject near the centre so phones crop it well."
            allowVideo
            aspect="aspect-video"
            value={media}
            onChange={(next) => set({ mediaUrl: next?.url || '', mediaType: next?.type || 'IMAGE', posterUrl: next?.posterUrl || '' })}
          />
        </div>
      )}

      {has('collection') && (
        <SelectInput
          className="max-w-md"
          label="Collection to feature"
          value={collectionIds[0] || ''}
          onChange={(event) => setCollectionIds(event.target.value ? [event.target.value] : [])}
        >
          <option value="">Choose a collection…</option>
          {lookups.collections.map((collection) => (
            <option key={collection.id} value={collection.id}>
              {collection.name}
              {!collection.published ? ' (hidden)' : ''}
            </option>
          ))}
        </SelectInput>
      )}

      {has('look') && (
        <Field label="Image to use" hint="Only lookbook images are listed. Add markers to an image in the Lookbook editor.">
          {lookups.looks.length === 0 ? (
            <p className="text-sm text-graphite">No lookbook images yet.</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-7">
              {lookups.looks.map((look) => {
                const selected = content.lookItemId === look.id;
                return (
                  <button
                    key={look.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => set({ lookItemId: look.id })}
                    title={look.caption || look.lookbook}
                    className={cx('relative aspect-[4/5] overflow-hidden bg-bone text-left', selected ? 'outline outline-2 outline-offset-2 outline-ink' : 'opacity-70 hover:opacity-100')}
                  >
                    {look.mediaUrl && <img src={resized(look.mediaUrl, 240)} alt="" className="absolute inset-0 size-full object-cover" />}
                    <span className="absolute inset-x-0 bottom-0 bg-ink/75 px-1.5 py-1 text-[0.625rem] leading-tight text-paper">
                      {look.caption || look.lookbook} · {look.productCount} {look.productCount === 1 ? 'piece' : 'pieces'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Field>
      )}

      {has('products') && (
        <ProductPicker label={`Products to show (up to ${config.maxProducts})`} value={productIds} onChange={setProductIds} options={lookups.products} max={config.maxProducts} />
      )}

      {(has('cta') || has('ctaLabel')) && (
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Button text" optional={!has('cta')} placeholder="e.g. Shop the drop" {...text('ctaLabel')} />
          {has('cta') && <LinkField label="Button goes to" value={content.ctaHref} onChange={(ctaHref) => set({ ctaHref })} destinations={lookups.destinations} />}
        </div>
      )}
      {has('cta2') && (
        <div className="grid gap-5 md:grid-cols-2">
          <TextInput label="Second button text" optional {...text('cta2Label')} />
          <LinkField label="Second button goes to" value={content.cta2Href} onChange={(cta2Href) => set({ cta2Href })} destinations={lookups.destinations} />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-mist pt-5">
        {config.manage ? (
          <Link to={config.manage.to} className="link-underlined text-[0.8125rem]">
            {config.manage.label}
          </Link>
        ) : (
          <span />
        )}
        <Button onClick={save} loading={saving}>
          Save {config.name.toLowerCase()}
        </Button>
      </div>
    </div>
  );
};

export const Homepage = () => {
  const toast = useToast();
  const { data: sections, loading, error, reload, setData } = useFetch('/admin/homepage');
  const { data: products } = useProductOptions();
  const { data: collections } = useFetch('/admin/collections');
  const { data: categories } = useFetch('/admin/categories');
  const { data: looks } = useFetch('/admin/looks');
  const [openId, setOpenId] = useState(null);

  const lookups = useMemo(
    () => ({
      products: products || [],
      collections: collections || [],
      looks: looks || [],
      destinations: [
        { href: '/shop', label: 'Shop — all products' },
        { href: '/shop?sort=newest', label: 'Shop — new arrivals' },
        { href: '/collections', label: 'Collections & drops' },
        { href: '/lookbook', label: 'Lookbook' },
        ...(collections || []).map((collection) => ({ href: `/collections/${collection.slug}`, label: `Collection: ${collection.name}` })),
        ...(categories || []).map((category) => ({ href: `/shop?category=${category.slug}`, label: `Category: ${category.name}` })),
      ],
    }),
    [products, collections, categories, looks],
  );

  const toggle = async (section, enabled) => {
    setData(sections.map((entry) => (entry.id === section.id ? { ...entry, enabled } : entry)));
    try {
      await api.put(`/admin/homepage/${section.id}`, {
        enabled,
        content: section.content,
        productIds: section.productIds,
        collectionIds: section.collectionIds,
      });
      toast.success(`${SECTIONS[section.type].name} is now ${enabled ? 'showing' : 'hidden'} on the homepage.`);
    } catch (failure) {
      toast.error(failure.message);
      reload();
    }
  };

  const move = async (index, delta) => {
    const next = [...sections];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setData(next);
    try {
      await api.put('/admin/homepage/order', { ids: next.map((section) => section.id) });
    } catch (failure) {
      toast.error(failure.message);
      reload();
    }
  };

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Your homepage is built from these sections, top to bottom. Switch them on or off, change the order with the arrows, and open one to edit it."
      >
        <Button variant="outline" size="sm" href="/" target="_blank" rel="noreferrer">
          View homepage
        </Button>
      </PageHeader>

      {error && <ErrorNote error={error} onRetry={reload} />}
      {loading && !sections && (
        <div className="space-y-3" role="status" aria-label="Loading homepage sections">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="skeleton h-20" />
          ))}
        </div>
      )}

      {sections && (
        <ol className="space-y-3">
          {sections.map((section, index) => {
            const config = SECTIONS[section.type];
            if (!config) return null;
            const open = openId === section.id;
            return (
              <li key={section.id} className={cx('border bg-white', open ? 'border-ink' : 'border-mist')}>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 md:px-5">
                  <div className="flex flex-col">
                    <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${config.name} up`} className="px-1 leading-none disabled:opacity-20">
                      ↑
                    </button>
                    <button type="button" onClick={() => move(index, 1)} disabled={index === sections.length - 1} aria-label={`Move ${config.name} down`} className="px-1 leading-none disabled:opacity-20">
                      ↓
                    </button>
                  </div>
                  <button type="button" className="min-w-40 flex-1 text-left" onClick={() => setOpenId(open ? null : section.id)} aria-expanded={open}>
                    <span className={cx('block text-sm font-semibold', !section.enabled && 'text-stone')}>{config.name}</span>
                    <span className="block text-[0.8125rem] text-graphite">{config.about}</span>
                  </button>
                  <Toggle label={section.enabled ? 'Showing' : 'Hidden'} checked={section.enabled} onChange={(enabled) => toggle(section, enabled)} />
                  <button
                    type="button"
                    onClick={() => setOpenId(open ? null : section.id)}
                    className="flex items-center gap-2 border border-mist px-3 py-2 text-[0.8125rem] hover:border-ink"
                  >
                    {open ? 'Close' : 'Edit'}
                    <ChevronIcon size={10} direction={open ? 'up' : 'down'} />
                  </button>
                </div>
                {open && <SectionEditor key={section.id} section={section} lookups={lookups} onSaved={setData} />}
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
};
