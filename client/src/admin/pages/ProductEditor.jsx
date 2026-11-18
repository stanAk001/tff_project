import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Button from '../../components/ui/Button.jsx';
import { CloseIcon } from '../../components/ui/Icons.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { api } from '../../services/api.js';
import { cx, isLightColour, naira } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { ImageGallery, MediaField } from '../components/MediaUploader.jsx';
import { ErrorNote, Field, PageHeader, Panel, SelectInput, TextArea, TextInput, Toggle } from '../components/ui.jsx';

const SIZE_PRESETS = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'One Size'];
const COLOUR_PRESETS = [
  { name: 'Black', hex: '#121212' },
  { name: 'Off-White', hex: '#ECE8E0' },
  { name: 'Cream', hex: '#E2D8C5' },
  { name: 'Charcoal', hex: '#3A3A3C' },
  { name: 'Stone', hex: '#A9A397' },
  { name: 'Olive', hex: '#5B5C46' },
  { name: 'Navy', hex: '#1F2A44' },
  { name: 'Brown', hex: '#5A3E2B' },
];

const BLANK = {
  name: '',
  slug: '',
  description: '',
  price: '',
  compareAtPrice: '',
  sku: '',
  categoryId: '',
  gender: 'UNISEX',
  tags: [],
  collectionIds: [],
  images: [],
  video: null,
  colours: [],
  sizes: [],
  stock: {}, // "Colour|Size" → quantity
  skus: {}, // "Colour|Size" → SKU (kept for existing variants)
  featured: false,
  isNew: true,
  bestseller: false,
  limited: false,
  seoTitle: '',
  seoDescription: '',
  status: 'DRAFT',
};

const key = (colour, size) => `${colour}|${size}`;

// Saved product → form
const toForm = (product) => {
  const colours = [];
  const sizes = [];
  const stock = {};
  const skus = {};
  for (const variant of product.variants) {
    if (!colours.some((colour) => colour.name === variant.colour)) colours.push({ name: variant.colour, hex: variant.colourHex });
    if (!sizes.includes(variant.size)) sizes.push(variant.size);
    stock[key(variant.colour, variant.size)] = variant.stock;
    skus[key(variant.colour, variant.size)] = variant.sku || '';
  }
  const order = (size) => (SIZE_PRESETS.includes(size) ? SIZE_PRESETS.indexOf(size) : 99);
  sizes.sort((a, b) => order(a) - order(b));
  const video = product.videos[0];
  return {
    ...BLANK,
    ...product,
    price: product.price,
    compareAtPrice: product.compareAtPrice || '',
    sku: product.sku || '',
    categoryId: product.categoryId || '',
    seoTitle: product.seoTitle || '',
    seoDescription: product.seoDescription || '',
    images: product.images.map(({ url, publicId, alt, colour, width, height }) => ({ url, publicId, alt: alt || '', colour: colour || '', width, height })),
    video: video ? { url: video.url, type: 'VIDEO', posterUrl: video.posterUrl || '', publicId: video.publicId } : null,
    colours,
    sizes,
    stock,
    skus,
  };
};

const code = (text) => text.replace(/[^A-Za-z0-9]/g, '').slice(0, 3).toUpperCase();

// Form → what the API expects. One variant per colour × size.
const toPayload = (form, status) => ({
  name: form.name,
  slug: form.slug,
  description: form.description,
  price: Number(form.price) || 0,
  compareAtPrice: form.compareAtPrice ? Number(form.compareAtPrice) : null,
  sku: form.sku,
  categoryId: form.categoryId,
  gender: form.gender,
  tags: form.tags,
  collectionIds: form.collectionIds,
  images: form.images,
  videos: form.video ? [{ url: form.video.url, publicId: form.video.publicId, posterUrl: form.video.posterUrl }] : [],
  variants: form.colours.flatMap((colour) =>
    form.sizes.map((size) => ({
      colour: colour.name,
      colourHex: colour.hex,
      size,
      stock: Number(form.stock[key(colour.name, size)]) || 0,
      sku: form.skus[key(colour.name, size)] || (form.sku ? `${form.sku}-${code(colour.name)}-${size === 'One Size' ? 'OS' : size.toUpperCase().replace(/\s+/g, '')}` : ''),
    })),
  ),
  featured: form.featured,
  isNew: form.isNew,
  bestseller: form.bestseller,
  limited: form.limited,
  seoTitle: form.seoTitle,
  seoDescription: form.seoDescription,
  status,
});

// Checked before anything is sent, so problems are explained in plain words
const validate = (form, publishing) => {
  const problems = {};
  if (!form.name.trim()) problems.name = 'Give the product a name.';
  if (!form.description.trim()) problems.description = 'Add a description.';
  if (!Number(form.price)) problems.price = 'Enter a price.';
  if (form.compareAtPrice && Number(form.compareAtPrice) <= Number(form.price)) {
    problems.compareAtPrice = 'The original price should be higher than the selling price.';
  }
  if (form.colours.length === 0) problems.colours = 'Add at least one colour.';
  else if (form.colours.some((colour) => !colour.name.trim())) problems.colours = 'Every colour needs a name.';
  else if (new Set(form.colours.map((colour) => colour.name.trim().toLowerCase())).size !== form.colours.length) {
    problems.colours = 'Two colours have the same name.';
  }
  if (form.sizes.length === 0) problems.sizes = 'Add at least one size. For bags, caps and similar, choose “One Size”.';
  if (publishing && form.images.length === 0) problems.images = 'Add at least one photo before publishing.';
  return problems;
};

const Step = ({ number, title, description, children, id }) => (
  <Panel
    title={
      <span className="flex items-baseline gap-3" id={id}>
        <span className="text-[0.75rem] tabular-nums text-stone">{String(number).padStart(2, '0')}</span>
        {title}
      </span>
    }
    description={description}
  >
    {children}
  </Panel>
);

// ── Colours, sizes and the stock grid ────────────────────────────────────

const VariantBuilder = ({ form, update, errors }) => {
  const [customSize, setCustomSize] = useState('');

  const addColour = (preset) =>
    update({ colours: [...form.colours, preset || { name: '', hex: '#888888' }] });
  const changeColour = (index, changes) => {
    const previous = form.colours[index];
    const next = form.colours.map((colour, i) => (i === index ? { ...colour, ...changes } : colour));
    // Renaming a colour carries its stock and SKUs (and tagged photos) along with it
    if (changes.name != null && changes.name !== previous.name) {
      const stock = { ...form.stock };
      const skus = { ...form.skus };
      for (const size of form.sizes) {
        stock[key(changes.name, size)] = stock[key(previous.name, size)];
        skus[key(changes.name, size)] = skus[key(previous.name, size)];
        delete stock[key(previous.name, size)];
        delete skus[key(previous.name, size)];
      }
      const images = form.images.map((image) => (image.colour === previous.name ? { ...image, colour: changes.name } : image));
      update({ colours: next, stock, skus, images });
    } else {
      update({ colours: next });
    }
  };
  const removeColour = (index) => update({ colours: form.colours.filter((_, i) => i !== index) });

  const toggleSize = (size) =>
    update({ sizes: form.sizes.includes(size) ? form.sizes.filter((item) => item !== size) : [...form.sizes, size] });
  const addCustomSize = (event) => {
    event.preventDefault();
    const size = customSize.trim();
    if (size && !form.sizes.includes(size)) update({ sizes: [...form.sizes, size] });
    setCustomSize('');
  };

  const setStock = (colour, size, value) => update({ stock: { ...form.stock, [key(colour, size)]: value } });
  const fillAll = () => {
    const amount = window.prompt('Set every size and colour to how many in stock?', '10');
    if (amount == null || Number.isNaN(Number(amount)) || Number(amount) < 0) return;
    const stock = {};
    for (const colour of form.colours) for (const size of form.sizes) stock[key(colour.name, size)] = Math.floor(Number(amount));
    update({ stock });
  };

  const unusedPresets = COLOUR_PRESETS.filter((preset) => !form.colours.some((colour) => colour.name.toLowerCase() === preset.name.toLowerCase()));
  const total = form.colours.reduce((sum, colour) => sum + form.sizes.reduce((s, size) => s + (Number(form.stock[key(colour.name, size)]) || 0), 0), 0);

  return (
    <div className="space-y-8">
      <Field label="Colours" error={errors.colours} hint="Click the colour square to pick the exact shade shoppers will see.">
        <ul className="space-y-2">
          {form.colours.map((colour, index) => (
            <li key={index} className="flex items-center gap-2">
              <input
                type="color"
                value={colour.hex}
                onChange={(event) => changeColour(index, { hex: event.target.value })}
                aria-label={`Shade for ${colour.name || 'colour'}`}
                className="size-10 shrink-0 cursor-pointer border border-mist bg-white p-1"
              />
              <input
                value={colour.name}
                onChange={(event) => changeColour(index, { name: event.target.value })}
                placeholder="Colour name, e.g. Black"
                aria-label="Colour name"
                className="block w-full max-w-xs border border-mist bg-white px-3 py-2.5 placeholder:text-stone focus:border-ink focus:outline-none"
              />
              <button type="button" onClick={() => removeColour(index)} aria-label={`Remove ${colour.name || 'colour'}`} className="flex size-10 items-center justify-center text-graphite hover:text-danger">
                <CloseIcon size={11} />
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {unusedPresets.slice(0, 6).map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => addColour(preset)}
              className="flex items-center gap-2 border border-mist bg-white px-2.5 py-1.5 text-[0.8125rem] hover:border-ink"
            >
              <span className={cx('size-3.5 rounded-full', isLightColour(preset.hex) && 'border border-mist')} style={{ backgroundColor: preset.hex }} />
              {preset.name}
            </button>
          ))}
          <button type="button" onClick={() => addColour()} className="border border-ink px-2.5 py-1.5 text-[0.8125rem] font-medium hover:bg-ink hover:text-paper">
            + Another colour
          </button>
        </div>
      </Field>

      <Field label="Sizes" error={errors.sizes}>
        <div className="flex flex-wrap gap-2">
          {[...SIZE_PRESETS, ...form.sizes.filter((size) => !SIZE_PRESETS.includes(size))].map((size) => {
            const selected = form.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSize(size)}
                className={cx('h-10 min-w-12 border px-3 text-sm', selected ? 'border-ink bg-ink text-paper' : 'border-mist bg-white hover:border-ink')}
              >
                {size}
              </button>
            );
          })}
        </div>
        <form onSubmit={addCustomSize} className="mt-3 flex max-w-xs gap-2">
          <input
            value={customSize}
            onChange={(event) => setCustomSize(event.target.value)}
            placeholder="Another size, e.g. 32"
            aria-label="Add another size"
            maxLength={20}
            className="block w-full border border-mist bg-white px-3 py-2 placeholder:text-stone focus:border-ink focus:outline-none"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!customSize.trim()}>
            Add
          </Button>
        </form>
      </Field>

      {form.colours.length > 0 && form.sizes.length > 0 && (
        <div>
          <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[0.8125rem] font-medium">How many do you have of each?</p>
              <p className="text-[0.8125rem] text-graphite">
                {form.colours.length * form.sizes.length} combinations · {total} in stock in total. Leave a box at 0 if it isn’t available.
              </p>
            </div>
            <button type="button" onClick={fillAll} className="link-underlined text-[0.8125rem]">
              Set all to the same number
            </button>
          </div>
          <div className="overflow-x-auto border border-mist">
            <table className="w-full bg-white text-sm">
              <thead>
                <tr className="border-b border-mist">
                  <th scope="col" className="px-3 py-2.5 text-left text-[0.75rem] font-medium text-graphite">
                    Colour
                  </th>
                  {form.sizes.map((size) => (
                    <th key={size} scope="col" className="px-2 py-2.5 text-center text-[0.75rem] font-medium text-graphite">
                      {size}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {form.colours.map((colour, index) => (
                  <tr key={index} className="border-b border-mist last:border-0">
                    <th scope="row" className="whitespace-nowrap px-3 py-2 text-left font-medium">
                      <span className="flex items-center gap-2">
                        <span className={cx('size-3.5 shrink-0 rounded-full', isLightColour(colour.hex) && 'border border-mist')} style={{ backgroundColor: colour.hex }} />
                        {colour.name || <span className="font-normal text-stone">Unnamed</span>}
                      </span>
                    </th>
                    {form.sizes.map((size) => (
                      <td key={size} className="px-1.5 py-1.5 text-center">
                        <input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={form.stock[key(colour.name, size)] ?? ''}
                          placeholder="0"
                          onChange={(event) => setStock(colour.name, size, event.target.value)}
                          aria-label={`Stock for ${colour.name} in ${size}`}
                          className="w-16 border border-mist px-2 py-2 text-center tabular-nums focus:border-ink focus:outline-none"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Preview ──────────────────────────────────────────────────────────────

const Preview = ({ form, categoryName, open, onClose }) => (
  <Modal open={open} onClose={onClose} title="Preview — how shoppers will see it" wide>
    <div className="grid gap-6 p-5 sm:grid-cols-2 md:p-8">
      <div className="relative aspect-[4/5] overflow-hidden bg-bone">
        {form.images[0] ? (
          <img src={resized(form.images[0].url, 900)} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-graphite">No photo yet — add one in step 2.</p>
        )}
      </div>
      <div>
        {categoryName && <p className="eyebrow mb-4 text-[0.625rem] text-stone">{categoryName}</p>}
        <p className="display text-4xl">{form.name || 'Product name'}</p>
        <p className="mt-3 text-lg tabular-nums">
          {naira(Number(form.price) || 0)}{' '}
          {form.compareAtPrice && <s className="text-stone">{naira(Number(form.compareAtPrice))}</s>}
        </p>
        {form.colours.length > 0 && (
          <div className="mt-6">
            <p className="eyebrow text-[0.625rem]">Colour</p>
            <div className="mt-2 flex gap-2">
              {form.colours.map((colour, index) => (
                <span key={index} title={colour.name} className={cx('size-7 rounded-full', isLightColour(colour.hex) && 'border border-mist')} style={{ backgroundColor: colour.hex }} />
              ))}
            </div>
          </div>
        )}
        {form.sizes.length > 0 && (
          <div className="mt-5">
            <p className="eyebrow text-[0.625rem]">Size</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {form.sizes.map((size) => (
                <span key={size} className="flex h-9 min-w-10 items-center justify-center border border-mist px-2 text-sm">
                  {size}
                </span>
              ))}
            </div>
          </div>
        )}
        <p className="mt-6 whitespace-pre-line text-sm text-graphite">{form.description || 'Your description will appear here.'}</p>
      </div>
    </div>
  </Modal>
);

// ── The editor ───────────────────────────────────────────────────────────

const ProductEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const isNew = !id;

  const { data: product, loading, error: loadError } = useFetch(isNew ? null : `/admin/products/${id}`);
  const { data: categories } = useFetch('/admin/categories');
  const { data: collections } = useFetch('/admin/collections');

  const [form, setForm] = useState(BLANK);
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [saving, setSaving] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (product) {
      setForm(toForm(product));
      setDirty(false);
    }
  }, [product]);

  // Keep messages clear of the fixed save bar at the bottom of the screen
  useEffect(() => {
    document.documentElement.style.setProperty('--toast-offset', '4.5rem');
    return () => document.documentElement.style.removeProperty('--toast-offset');
  }, []);

  // Warn before losing unsaved work
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (event) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // After a failed save, re-check as the owner edits so each message disappears once it's fixed
  const lastAttempt = useRef(null);
  const update = (changes) => {
    setForm((current) => {
      const next = { ...current, ...changes };
      if (lastAttempt.current) setErrors(validate(next, lastAttempt.current === 'PUBLISHED'));
      return next;
    });
    setDirty(true);
  };
  const bind = (name) => ({
    value: form[name],
    error: errors[name],
    onChange: (event) => update({ [name]: event.target.value }),
  });

  const addTag = (event) => {
    event.preventDefault();
    const tag = tagInput.trim().toLowerCase();
    if (tag && !form.tags.includes(tag)) update({ tags: [...form.tags, tag] });
    setTagInput('');
  };

  const save = async (status) => {
    const publishing = status === 'PUBLISHED';
    const problems = validate(form, publishing);
    lastAttempt.current = status;
    setErrors(problems);
    setServerError('');
    if (Object.keys(problems).length) {
      toast.error('A few things need your attention before saving.');
      document.getElementById('problems')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    setSaving(status);
    try {
      const payload = toPayload(form, status);
      const saved = isNew ? await api.post('/admin/products', payload) : await api.put(`/admin/products/${id}`, payload);
      setDirty(false);
      toast.success(publishing ? (form.status === 'PUBLISHED' ? 'Changes saved and live in the store.' : 'Published — it is now in the store.') : 'Saved as a draft.');
      if (isNew) navigate(`/admin/products/${saved.id}`, { replace: true });
      else setForm(toForm(saved));
    } catch (failure) {
      setServerError(failure.message);
      toast.error(failure.message);
    } finally {
      setSaving(null);
    }
  };

  if (loadError) return <ErrorNote error={loadError} />;
  if (!isNew && loading) {
    return (
      <div className="space-y-6" role="status" aria-label="Loading product">
        <div className="skeleton h-12 w-72" />
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  const problemList = Object.values(errors).filter(Boolean);
  const categoryName = categories?.find((category) => category.id === form.categoryId)?.name;
  const live = form.status === 'PUBLISHED';

  return (
    <div className="pb-28">
      <PageHeader
        title={isNew ? 'Add a product' : form.name || 'Edit product'}
        description={isNew ? 'Work down the page. You can save a draft at any point and finish later.' : live ? 'This product is live in the store.' : 'This product is a draft — shoppers can’t see it yet.'}
        back={
          <Link to="/admin/products" className="link mb-3 inline-block text-[0.8125rem] text-graphite">
            ← All products
          </Link>
        }
      >
        {!isNew && live && product && (
          <Button variant="outline" size="sm" href={`/products/${product.slug}`} target="_blank" rel="noreferrer">
            View in store
          </Button>
        )}
      </PageHeader>

      {(problemList.length > 0 || serverError) && (
        <div id="problems" role="alert" className="mb-6 border border-danger bg-white p-5 text-sm text-danger">
          <p className="font-semibold">Please fix the following:</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {problemList.map((problem) => (
              <li key={problem}>{problem}</li>
            ))}
            {serverError && <li>{serverError}</li>}
          </ul>
        </div>
      )}

      <div className="space-y-6">
        <Step number={1} title="Name and description">
          <div className="space-y-5">
            <TextInput label="Product name" placeholder="e.g. TFF Oversized Tee" maxLength={120} {...bind('name')} />
            <TextArea
              label="Description"
              rows={5}
              placeholder="Fabric, fit, details — what makes this piece worth owning?"
              hint="Shown on the product page."
              {...bind('description')}
            />
          </div>
        </Step>

        <Step number={2} title="Photos and video" description="Upload the photos shoppers will see. Add a short video if you have one.">
          <ImageGallery images={form.images} onChange={(images) => update({ images })} colours={form.colours.map((colour) => colour.name).filter(Boolean)} error={errors.images} />
          <div className="mt-6 max-w-xs">
            <MediaField
              label="Video (optional)"
              hint="MP4, WebM or MOV. Keep it short — under 30 seconds works best."
              allowVideo
              aspect="aspect-[4/5]"
              value={form.video}
              onChange={(video) => update({ video: video && video.type === 'VIDEO' ? video : null })}
            />
          </div>
        </Step>

        <Step number={3} title="Price">
          <div className="grid max-w-xl gap-5 sm:grid-cols-2">
            <TextInput label="Price" type="number" min="0" inputMode="numeric" prefix="₦" placeholder="45000" {...bind('price')} />
            <TextInput
              label="Original price"
              optional
              type="number"
              min="0"
              inputMode="numeric"
              prefix="₦"
              hint="Only for items on sale. Shown crossed out beside the price."
              {...bind('compareAtPrice')}
            />
          </div>
        </Step>

        <Step number={4} title="Category and collection" description="Helps shoppers find this piece.">
          <div className="grid max-w-xl gap-5 sm:grid-cols-2">
            <SelectInput label="Category" {...bind('categoryId')}>
              <option value="">No category</option>
              {categories?.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </SelectInput>
            <SelectInput label="Made for" {...bind('gender')}>
              <option value="UNISEX">Everyone (unisex)</option>
              <option value="MEN">Men</option>
              <option value="WOMEN">Women</option>
            </SelectInput>
          </div>

          <Field label="Collections" className="mt-5" hint={collections?.length ? 'Tick every collection or drop this piece belongs to.' : undefined}>
            {collections?.length ? (
              <div className="flex flex-wrap gap-2">
                {collections.map((collection) => {
                  const selected = form.collectionIds.includes(collection.id);
                  return (
                    <button
                      key={collection.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        update({
                          collectionIds: selected ? form.collectionIds.filter((cid) => cid !== collection.id) : [...form.collectionIds, collection.id],
                        })
                      }
                      className={cx('border px-3 py-2 text-sm', selected ? 'border-ink bg-ink text-paper' : 'border-mist bg-white hover:border-ink')}
                    >
                      {collection.name}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-graphite">
                No collections yet. <Link to="/admin/collections/new" className="link-underlined text-ink">Create one</Link> — you can add this product to it afterwards.
              </p>
            )}
          </Field>

          <Field label="Search words" optional className="mt-5" hint="Extra words shoppers might search for, like “summer” or “cotton”.">
            <div className="flex flex-wrap items-center gap-2">
              {form.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-2 border border-mist bg-white py-1.5 pl-3 pr-2 text-[0.8125rem]">
                  {tag}
                  <button type="button" onClick={() => update({ tags: form.tags.filter((item) => item !== tag) })} aria-label={`Remove ${tag}`}>
                    <CloseIcon size={8} />
                  </button>
                </span>
              ))}
              <form onSubmit={addTag} className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(event) => setTagInput(event.target.value)}
                  placeholder="Type a word, press Enter"
                  aria-label="Add a search word"
                  maxLength={30}
                  className="w-52 border border-mist bg-white px-3 py-1.5 text-[0.8125rem] placeholder:text-stone focus:border-ink focus:outline-none"
                />
              </form>
            </div>
          </Field>
        </Step>

        <Step number={5} title="Colours, sizes and stock" description="Choose the colours and sizes this piece comes in, then say how many you have of each.">
          <VariantBuilder form={form} update={update} errors={errors} />
        </Step>

        <Step number={6} title="Highlights" description="Optional labels that help a piece stand out.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Toggle label="New arrival" description="Shows a “New” label." checked={form.isNew} onChange={(value) => update({ isNew: value })} />
            <Toggle label="Featured" description="Appears first in the shop." checked={form.featured} onChange={(value) => update({ featured: value })} />
            <Toggle label="Limited edition" description="Shows a “Limited” label." checked={form.limited} onChange={(value) => update({ limited: value })} />
            <Toggle label="Bestseller" description="Marks it as a customer favourite." checked={form.bestseller} onChange={(value) => update({ bestseller: value })} />
          </div>
        </Step>

        <details className="border border-mist bg-white">
          <summary className="cursor-pointer px-5 py-4 text-sm font-semibold md:px-6">
            More options <span className="font-normal text-graphite">— product code, web address and Google listing</span>
          </summary>
          <div className="grid gap-5 border-t border-mist p-5 sm:grid-cols-2 md:p-6">
            <TextInput label="Product code (SKU)" optional placeholder="e.g. TFF-OVT" hint="Your own reference. Codes for each size and colour are created from it." {...bind('sku')} />
            <TextInput label="Web address" optional prefix="/" placeholder="made-from-the-name" hint="Leave blank to create it from the product name." {...bind('slug')} />
            <TextInput label="Title on Google" optional maxLength={120} hint="Leave blank to use the product name." {...bind('seoTitle')} />
            <TextArea label="Description on Google" optional rows={2} maxLength={300} hint="Leave blank to use the product description." {...bind('seoDescription')} />
          </div>
        </details>
      </div>

      {/* Always-visible save bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-mist bg-paper lg:left-60">
        <div className="mx-auto flex max-w-[78rem] flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
          <p className="text-[0.8125rem] text-graphite" role="status">
            {dirty ? 'You have unsaved changes.' : isNew ? 'Nothing saved yet.' : 'All changes saved.'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => setPreviewing(true)}>
              Preview
            </Button>
            <Button size="sm" variant="outline" onClick={() => save('DRAFT')} loading={saving === 'DRAFT'} disabled={Boolean(saving)}>
              {live ? 'Unpublish & save' : 'Save draft'}
            </Button>
            <Button size="sm" onClick={() => save('PUBLISHED')} loading={saving === 'PUBLISHED'} disabled={Boolean(saving)}>
              {live ? 'Save changes' : 'Publish'}
            </Button>
          </div>
        </div>
      </div>

      <Preview form={form} categoryName={categoryName} open={previewing} onClose={() => setPreviewing(false)} />
    </div>
  );
};

export default ProductEditor;
