import { useMemo, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { CheckIcon, CloseIcon } from '../../components/ui/Icons.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { useFetch } from '../../hooks/useFetch.js';
import { cx, naira } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { SearchInput } from './ui.jsx';

const Thumb = ({ url }) => (
  <span className="relative block aspect-[4/5] w-10 shrink-0 overflow-hidden bg-bone">
    {url && <img src={resized(url, 120)} alt="" className="absolute inset-0 size-full object-cover" />}
  </span>
);

// Loads the product list once for any picker on the page
export const useProductOptions = () => useFetch('/admin/products/options');

// Choose and order products (homepage sections, collections).
// value: [productId]   onChange([productId])
const ProductPicker = ({ value, onChange, options, max = 50, label = 'Products' }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const byId = useMemo(() => new Map((options || []).map((product) => [product.id, product])), [options]);
  const selected = value.map((id) => byId.get(id)).filter(Boolean);
  const matches = (options || []).filter((product) => product.name.toLowerCase().includes(query.toLowerCase()));

  const toggle = (id) => {
    if (value.includes(id)) onChange(value.filter((item) => item !== id));
    else if (value.length < max) onChange([...value, id]);
  };
  const move = (index, delta) => {
    const next = [...value];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-[0.8125rem] font-medium">
          {label} <span className="font-normal text-stone">{selected.length} chosen</span>
        </p>
        <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
          Choose products
        </Button>
      </div>

      {selected.length === 0 ? (
        <p className="border border-dashed border-stone px-4 py-6 text-center text-sm text-graphite">No products chosen yet.</p>
      ) : (
        <ol className="divide-y divide-mist border border-mist bg-white">
          {selected.map((product, index) => (
            <li key={product.id} className="flex items-center gap-3 px-3 py-2">
              <span className="w-5 text-center text-[0.75rem] tabular-nums text-stone">{index + 1}</span>
              <Thumb url={product.imageUrl} />
              <span className="min-w-0 flex-1 truncate text-sm">
                {product.name}
                {product.status !== 'PUBLISHED' && <span className="ml-2 text-[0.75rem] text-stone">Draft — hidden from shoppers</span>}
              </span>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} aria-label={`Move ${product.name} up`} className="px-2 py-1 text-sm disabled:opacity-25">
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === selected.length - 1}
                aria-label={`Move ${product.name} down`}
                className="px-2 py-1 text-sm disabled:opacity-25"
              >
                ↓
              </button>
              <button type="button" onClick={() => toggle(product.id)} aria-label={`Remove ${product.name}`} className="flex size-7 items-center justify-center">
                <CloseIcon size={10} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <Modal open={open} onClose={() => setOpen(false)} side="right" title={`Choose products (${value.length}${max < 50 ? ` of ${max}` : ''})`}>
        <div className="sticky top-0 z-10 border-b border-mist bg-paper p-4">
          <SearchInput value={query} onChange={setQuery} placeholder="Search products" />
        </div>
        <ul className="flex-1 divide-y divide-mist">
          {matches.map((product) => {
            const checked = value.includes(product.id);
            const full = !checked && value.length >= max;
            return (
              <li key={product.id}>
                <button
                  type="button"
                  onClick={() => toggle(product.id)}
                  disabled={full}
                  aria-pressed={checked}
                  className={cx('flex w-full items-center gap-3 px-4 py-2.5 text-left disabled:opacity-40', checked && 'bg-bone')}
                >
                  <span className={cx('flex size-5 shrink-0 items-center justify-center border', checked ? 'border-ink bg-ink text-paper' : 'border-stone')}>
                    {checked && <CheckIcon size={10} />}
                  </span>
                  <Thumb url={product.imageUrl} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{product.name}</span>
                    <span className="block text-[0.75rem] text-graphite">
                      {naira(product.price)}
                      {product.status !== 'PUBLISHED' && ' · Draft'}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
          {matches.length === 0 && <li className="p-8 text-center text-sm text-graphite">No products match “{query}”.</li>}
        </ul>
        <div className="sticky bottom-0 border-t border-mist bg-paper p-4">
          <Button full onClick={() => setOpen(false)}>
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default ProductPicker;
