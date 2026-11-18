import { motion } from 'motion/react';
import { memo, useState } from 'react';
import { Link } from 'react-router';
import { useWishlist } from '../../context/StoreContext.jsx';
import { cx, isLightColour, naira } from '../../utils/format.js';
import { HeartIcon, PlusIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';

export const Price = ({ price, compareAtPrice, className }) => (
  <p className={cx('tabular-nums', className)}>
    {compareAtPrice > price ? (
      <>
        <span className="sr-only">Sale price </span>
        <span>{naira(price)}</span>{' '}
        <span className="sr-only">Original price </span>
        <s className="text-stone decoration-1">{naira(compareAtPrice)}</s>
      </>
    ) : (
      naira(price)
    )}
  </p>
);

// At most one badge, in order of what matters most to a shopper
export const badgeFor = (product) => {
  if (product.soldOut) return 'Sold out';
  if (product.limited) return 'Limited';
  if (product.compareAtPrice > product.price) return 'Sale';
  if (product.isNew) return 'New';
  return null;
};

const ProductCard = ({ product, onQuickAdd, sizes = '(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, 50vw', priority = false, ratio = 'aspect-[4/5]' }) => {
  const wishlist = useWishlist();
  const saved = wishlist.has(product.id);
  const badge = badgeFor(product);
  const [shownColour, setShownColour] = useState(null);
  const photoOf = (colour) => product.images.find((image) => image.colour?.toLowerCase() === colour.toLowerCase());
  // A swatch with its own photo swaps the card to that colourway
  const colourPhoto = shownColour ? photoOf(shownColour) : null;
  const primary = colourPhoto || product.images[0];
  const secondary = colourPhoto ? null : product.images.find((image) => image !== primary && (!image.colour || image.colour === primary?.colour));
  const tone = (shownColour && product.colours.find((colour) => colour.name === shownColour)?.hex) || product.colours[0]?.hex;

  return (
    <article className="group relative" onMouseLeave={() => setShownColour(null)}>
      <div className={cx('relative overflow-hidden', ratio)}>
        <Link to={`/products/${product.slug}`} className="absolute inset-0 block" aria-label={product.name}>
          <Media
            src={primary?.url}
            alt={primary?.alt || product.name}
            tone={tone}
            label="Photo"
            sizes={sizes}
            maxWidth={1440}
            priority={priority}
            className="transition-transform duration-[1200ms] ease-out-expo group-hover:scale-[1.03]"
          />
          {/* Second angle fades in on hover (pointer devices only) */}
          {secondary && (
            <div className="absolute inset-0 opacity-0 transition-opacity duration-500 [@media(hover:hover)]:group-hover:opacity-100">
              <Media src={secondary.url} alt="" sizes={sizes} maxWidth={1440} />
            </div>
          )}
        </Link>

        {badge && (
          <span
            className={cx(
              'eyebrow pointer-events-none absolute left-3 top-3 px-2.5 py-2 text-[0.5625rem]',
              product.soldOut ? 'bg-paper text-graphite' : 'bg-ink text-paper',
            )}
          >
            {badge}
          </span>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.8 }}
          onClick={() => wishlist.toggle(product)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          className={cx(
            'absolute right-2 top-2 flex size-9 items-center justify-center rounded-full bg-paper/90 text-ink transition-opacity',
            !saved && 'md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100',
          )}

        >
          <HeartIcon filled={saved} />
        </motion.button>

        {onQuickAdd && !product.soldOut && (
          <>
            {/* Desktop: a bar slides up on hover. Touch: a small always-visible button. */}
            <button
              type="button"
              onClick={() => onQuickAdd(product)}
              className="eyebrow absolute inset-x-0 bottom-0 hidden h-12 translate-y-full items-center justify-center bg-paper text-ink transition-transform duration-500 ease-out-expo focus-visible:translate-y-0 group-hover:translate-y-0 [@media(hover:hover)]:flex"
            >
              Quick add
            </button>
            <button
              type="button"
              onClick={() => onQuickAdd(product)}
              aria-label={`Quick add ${product.name}`}
              className="absolute bottom-2 right-2 flex size-10 items-center justify-center bg-paper text-ink [@media(hover:hover)]:hidden"
            >
              <PlusIcon />
            </button>
          </>
        )}
      </div>

      <div className="mt-3.5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-medium">
            <Link to={`/products/${product.slug}`}>{product.name}</Link>
          </h3>
          <Price price={product.price} compareAtPrice={product.compareAtPrice} className="mt-0.5 text-sm text-graphite" />
        </div>
        {product.colours.length > 1 && (
          <ul className="-mr-1.5 flex shrink-0" aria-label={`${product.colours.length} colours`}>
            {product.colours.slice(0, 4).map((colour) => {
              const swatch = (
                <span
                  className={cx(
                    'block size-2.5 rounded-full transition-transform duration-300',
                    isLightColour(colour.hex) && 'border border-stone/50',
                    shownColour === colour.name && 'scale-125 outline-1 outline-offset-2 outline-ink',
                  )}
                  style={{ backgroundColor: colour.hex }}
                />
              );
              return (
                <li key={colour.name} title={colour.name}>
                  {photoOf(colour.name) ? (
                    // Generous hit area around a small dot, so it works with a fingertip too
                    <button
                      type="button"
                      className="flex size-6 items-center justify-center"
                      aria-label={`Show ${product.name} in ${colour.name}`}
                      aria-pressed={shownColour === colour.name}
                      onMouseEnter={() => setShownColour(colour.name)}
                      onFocus={() => setShownColour(colour.name)}
                      onClick={() => setShownColour(colour.name)}
                    >
                      {swatch}
                    </button>
                  ) : (
                    <span className="flex size-6 items-center justify-center">{swatch}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </article>
  );
};

export default memo(ProductCard);
