import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { cx, naira } from '../utils/format.js';
import { resized } from '../utils/media.js';
import { ArrowIcon } from './ui/Icons.jsx';
import Media from './ui/Media.jsx';

// A campaign image with a marker on each piece being worn. Markers and the
// product list stay in sync: pointing at one highlights the other.
// Width ÷ height of an image, once it has loaded
const useImageRatio = (src) => {
  const [ratio, setRatio] = useState(null);
  useEffect(() => {
    setRatio(null);
    if (!src) return undefined;
    const image = new Image();
    image.onload = () => setRatio(image.naturalWidth / image.naturalHeight);
    image.src = resized(src, 480);
    return () => {
      image.onload = null;
    };
  }, [src]);
  return ratio;
};

export const LookImage = ({ look, active, onActive, sizes = '(min-width: 1024px) 60vw, 100vw', tone = '#55524d', className }) => {
  const ratio = useImageRatio(look.mediaType === 'IMAGE' ? look.mediaUrl : null);
  // Marker positions are measured on the whole photo, but the frame crops it to fill.
  // This layer is sized exactly like the cropped photo, so markers stay on the garment.
  const layer = ratio
    ? { width: `max(100cqw, calc(100cqh * ${ratio}))`, aspectRatio: String(ratio), left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }
    : { inset: 0 };

  return (
  <div className={cx('relative overflow-hidden', className)} style={{ containerType: 'size' }}>
    <Media
      src={look.mediaUrl}
      type={look.mediaType}
      poster={look.posterUrl}
      alt={look.caption || 'TFF look'}
      tone={tone}
      label={look.caption || 'Look image'}
      sizes={sizes}
    />
    <div className="pointer-events-none absolute" style={layer}>
    {look.products.map(({ product, x, y }, index) => {
      if (x == null || y == null) return null;
      const open = active === product.id;
      // Keep the label on screen when the marker sits near the right edge
      const alignRight = x > 60;
      return (
        <div key={product.id} className="pointer-events-auto absolute" style={{ left: `${x}%`, top: `${y}%` }}>
          <button
            type="button"
            onClick={() => onActive(open ? null : product.id)}
            onMouseEnter={() => onActive(product.id)}
            aria-expanded={open}
            aria-label={`${product.name}, ${naira(product.price)}`}
            className="relative -ml-5 -mt-5 flex size-10 items-center justify-center"
          >
            <span
              className={cx(
                'flex size-6 items-center justify-center rounded-full bg-paper text-[0.625rem] font-medium tabular-nums text-ink shadow-[0_2px_10px_rgba(0,0,0,0.2)] transition-transform duration-300',
                open && 'scale-125',
              )}
            >
              {index + 1}
            </span>
          </button>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.25 }}
                className={cx('absolute top-7 z-10 w-48', alignRight ? 'right-0 -mr-5' : 'left-0 -ml-5')}
              >
                <Link to={`/products/${product.slug}`} className="block bg-paper p-3.5 text-ink shadow-[0_8px_30px_rgba(0,0,0,0.15)]">
                  <span className="block text-sm font-medium leading-snug">{product.name}</span>
                  <span className="mt-1 flex items-center justify-between text-sm text-graphite">
                    {naira(product.price)}
                    <ArrowIcon size={12} />
                  </span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      );
    })}
    </div>
  </div>
  );
};

export const LookProductList = ({ look, active, onActive }) => (
  <ol className="divide-y divide-mist border-y border-mist">
    {look.products.map(({ product }, index) => (
      <li key={product.id}>
        <Link
          to={`/products/${product.slug}`}
          onMouseEnter={() => onActive(product.id)}
          onFocus={() => onActive(product.id)}
          className={cx('group flex items-center gap-4 py-4 transition-colors', active === product.id && 'bg-bone')}
        >
          <span className="w-6 text-center text-xs tabular-nums text-stone">{String(index + 1).padStart(2, '0')}</span>
          <span className="relative block aspect-[4/5] w-14 shrink-0 overflow-hidden">
            <Media src={product.images[0]?.url} alt="" tone={product.colours[0]?.hex} sizes="56px" maxWidth={320} compactPlaceholder />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{product.name}</span>
            <span className="block text-sm text-graphite">{product.soldOut ? 'Sold out' : naira(product.price)}</span>
          </span>
          <span className="pr-2 transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
            <ArrowIcon size={14} />
          </span>
        </Link>
      </li>
    ))}
  </ol>
);

// Homepage section
const ShopTheLook = ({ content, look }) => {
  const [active, setActive] = useState(null);
  if (!look || look.products.length === 0) return null;

  return (
    <section className="shell py-20 md:py-32" aria-labelledby="look-heading">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
        <LookImage look={look} active={active} onActive={setActive} className="aspect-[4/5] lg:col-span-7" />
        <div className="flex flex-col justify-center lg:col-span-5" onMouseLeave={() => setActive(null)}>
          {content.eyebrow && <p className="eyebrow mb-5 text-stone">{content.eyebrow}</p>}
          <h2 id="look-heading" className="display text-5xl md:text-6xl">
            {content.heading || 'Shop the look'}
          </h2>
          {content.body && <p className="mb-8 mt-5 max-w-sm text-graphite">{content.body}</p>}
          <LookProductList look={look} active={active} onActive={setActive} />
        </div>
      </div>
    </section>
  );
};

export default ShopTheLook;
