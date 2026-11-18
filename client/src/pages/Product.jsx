import { motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import NotifyMe from '../components/product/NotifyMe.jsx';
import { badgeFor, Price } from '../components/product/ProductCard.jsx';
import ProductGallery from '../components/product/ProductGallery.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import Reviews from '../components/product/Reviews.jsx';
import SizeGuide from '../components/product/SizeGuide.jsx';
import { LookImage, LookProductList } from '../components/ShopTheLook.jsx';
import { ImageReveal } from '../components/ui/Reveal.jsx';
import VariantSelector, { findVariant, firstAvailableColour } from '../components/product/VariantSelector.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorState, Skeleton, Stars, StateMessage } from '../components/ui/Feedback.jsx';
import { HeartIcon, PlusIcon } from '../components/ui/Icons.jsx';
import { useCart, useSettings, useWishlist } from '../context/StoreContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo, useSeo } from '../hooks/useSeo.js';
import { cx, naira } from '../utils/format.js';

const ProductSkeleton = () => (
  <div className="shell grid gap-10 py-6 md:py-12 lg:grid-cols-12" role="status" aria-label="Loading piece">
    <Skeleton className="aspect-[4/5] lg:col-span-7" />
    <div className="lg:col-span-4 lg:col-start-9">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="mt-5 h-12 w-4/5" />
      <Skeleton className="mt-4 h-5 w-28" />
      <Skeleton className="mt-10 h-10 w-40" />
      <Skeleton className="mt-8 h-12 w-full" />
      <Skeleton className="mt-8 h-14 w-full" />
    </div>
  </div>
);

const Disclosure = ({ title, children, defaultOpen = false }) => (
  <details className="group border-b border-mist" open={defaultOpen}>
    <summary className="eyebrow flex list-none items-center justify-between py-5 [&::-webkit-details-marker]:hidden">
      {title}
      <span className="transition-transform duration-300 group-open:rotate-45">
        <PlusIcon />
      </span>
    </summary>
    <div className="pb-6 leading-relaxed text-graphite">{children}</div>
  </details>
);

// The lookbook image this piece was styled in, with every other piece in the frame
// one click away. Comes straight from the lookbook data the owner manages.
const CompleteTheLook = ({ look, current }) => {
  const [active, setActive] = useState(null);
  const others = { ...look, products: look.products.filter((link) => link.product.id !== current) };
  return (
    <section className="bg-bone" aria-labelledby="look-heading">
      <div className="shell grid gap-10 py-16 md:py-28 lg:grid-cols-12 lg:gap-14">
        <ImageReveal className="lg:col-span-6">
          <LookImage look={look} active={active} onActive={setActive} className="aspect-[4/5]" sizes="(min-width: 1024px) 50vw, 100vw" />
        </ImageReveal>
        <div className="flex flex-col justify-center lg:col-span-5 lg:col-start-8" onMouseLeave={() => setActive(null)}>
          <p className="eyebrow mb-5 text-stone">{look.caption || 'From the lookbook'}</p>
          <h2 id="look-heading" className="display text-5xl md:text-6xl">
            Complete the look
          </h2>
          <p className="mb-8 mt-5 max-w-sm text-graphite">How we styled it. Tap a marker on the image, or pick a piece below.</p>
          <LookProductList look={others} active={active} onActive={setActive} />
          <Link to="/lookbook" className="eyebrow link-underlined mt-8 self-start">
            See the full lookbook
          </Link>
        </div>
      </div>
    </section>
  );
};

const productJsonLd = (product) => ({
  '@context': 'https://schema.org',
  '@type': 'Product',
  name: product.name,
  description: product.seoDescription || product.description,
  sku: product.sku || undefined,
  image: product.images.map((image) => image.url),
  brand: { '@type': 'Brand', name: 'TFF' },
  ...(product.rating.count
    ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: product.rating.average, reviewCount: product.rating.count } }
    : {}),
  offers: {
    '@type': 'Offer',
    url: window.location.origin + window.location.pathname,
    priceCurrency: 'NGN',
    price: product.price,
    availability: product.soldOut ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
  },
});

const ProductDetails = ({ product }) => {
  const navigate = useNavigate();
  const cart = useCart();
  const wishlist = useWishlist();
  const settings = useSettings();
  const toast = useToast();
  const buyRef = useRef(null);

  const [colour, setColour] = useState(() => firstAvailableColour(product));
  const [size, setSize] = useState(() => (product.sizes.length === 1 ? product.sizes[0] : null));
  const [busy, setBusy] = useState(null); // 'bag' | 'buy'
  const [sizeError, setSizeError] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [buyBarVisible, setBuyBarVisible] = useState(true);

  const variant = size ? findVariant(product.variants, colour, size) : null;
  const soldOut = variant ? variant.stock === 0 : false;
  const lowStockAt = settings?.store.lowStockThreshold ?? 3;
  const saved = wishlist.has(product.id);
  const badge = badgeFor(product);

  useSeo({
    title: product.seoTitle || product.name,
    description: product.seoDescription || product.description,
    image: product.images[0]?.url,
    type: 'product',
    jsonLd: productJsonLd(product),
  });

  // The mobile sticky bar appears only once the main buttons have scrolled away
  useEffect(() => {
    const target = buyRef.current;
    if (!target) return undefined;
    const observer = new IntersectionObserver(([entry]) => setBuyBarVisible(entry.isIntersecting), { threshold: 0 });
    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  const add = async (mode) => {
    if (!variant) {
      setSizeError(true);
      buyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setBusy(mode);
    try {
      await cart.add(variant.id, 1, { open: mode === 'bag' });
      if (mode === 'buy') navigate('/checkout');
      else {
        setJustAdded(true);
        setTimeout(() => setJustAdded(false), 2200);
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  const chooseColour = (next) => {
    setColour(next);
    if (size && !findVariant(product.variants, next, size)) setSize(null);
  };

  const addLabel = justAdded ? 'Added to bag' : variant ? 'Add to bag' : 'Select a size';

  return (
    <>
      <div className="shell grid gap-8 pb-16 pt-0 md:gap-12 md:pb-24 md:pt-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div>
            <ProductGallery product={product} colour={colour} />
          </div>
        </div>

        <motion.div
          className="lg:sticky lg:top-[calc(var(--nav-offset,4rem)+2rem)] lg:col-span-5 lg:self-start lg:pl-6 lg:transition-[top] lg:duration-500 xl:col-span-4 xl:col-start-9 xl:pl-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <nav aria-label="Breadcrumb" className="eyebrow mb-6 flex flex-wrap gap-2 text-[0.625rem] text-stone">
            <Link to="/shop" className="link">
              Shop
            </Link>
            {product.category && (
              <>
                <span aria-hidden="true">/</span>
                <Link to={`/shop?category=${product.category.slug}`} className="link">
                  {product.category.name}
                </Link>
              </>
            )}
          </nav>

          {badge && <p className="eyebrow mb-4 inline-block bg-ink px-2.5 py-2 text-[0.5625rem] text-paper">{badge}</p>}
          <h1 className="display text-[2.75rem] md:text-6xl">{product.name}</h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2">
            <Price price={product.price} compareAtPrice={product.compareAtPrice} className="text-xl" />
            {product.rating.count > 0 && (
              <a href="#reviews" className="flex items-center gap-2 text-sm text-graphite">
                <Stars rating={product.rating.average} />
                <span className="link-underlined">{product.rating.count}</span>
              </a>
            )}
          </div>

          <div className="mt-9" ref={buyRef}>
            <VariantSelector
              product={product}
              colour={colour}
              size={size}
              onColour={chooseColour}
              onSize={(next) => {
                setSize(next);
                setSizeError(false);
              }}
              allowSoldOut
              sizeGuide={<SizeGuide guide={product.category?.sizeGuide} categoryName={product.category?.name} />}
            />

            <div className="mt-4 min-h-5 text-[0.8125rem]" aria-live="polite">
              {sizeError && !variant && <p className="text-danger">Please choose a size first.</p>}
              {variant && soldOut && <p className="text-graphite">Sold out in this size</p>}
              {variant && !soldOut && variant.stock <= lowStockAt && (
                <p className="eyebrow text-[0.625rem] text-danger">Low stock — {variant.stock} left</p>
              )}
              {variant && !soldOut && variant.stock > lowStockAt && <p className="text-success">In stock — ready to ship</p>}
            </div>

            <div className="mt-5 space-y-3">
              {variant && soldOut ? (
                <NotifyMe variant={variant} />
              ) : (
                <>
                  <div className="flex gap-3">
                    <Button full onClick={() => add('bag')} loading={busy === 'bag'} disabled={busy === 'buy'}>
                      {addLabel}
                    </Button>
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.88 }}
                      onClick={() => wishlist.toggle(product)}
                      aria-pressed={saved}
                      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
                      className={cx(
                        'flex size-13 shrink-0 items-center justify-center border transition-colors',
                        saved ? 'border-ink bg-ink text-paper' : 'border-ink hover:bg-ink hover:text-paper',
                      )}
                    >
                      <HeartIcon filled={saved} />
                    </motion.button>
                  </div>
                  <Button variant="outline" full onClick={() => add('buy')} loading={busy === 'buy'} disabled={busy === 'bag'}>
                    Buy now
                  </Button>
                </>
              )}
            </div>
          </div>

          <div className="mt-10 border-t border-mist">
            <Disclosure title="Description" defaultOpen>
              <p className="whitespace-pre-line">{product.description}</p>
              {product.sku && <p className="mt-4 text-[0.8125rem] text-stone">Style no. {variant?.sku || product.sku}</p>}
            </Disclosure>
            {settings?.store.deliveryInfo && <Disclosure title="Delivery">{settings.store.deliveryInfo}</Disclosure>}
            {settings?.store.returnsInfo && <Disclosure title="Returns">{settings.store.returnsInfo}</Disclosure>}
          </div>

          {product.collections.length > 0 && (
            <p className="mt-6 text-sm text-graphite">
              Part of{' '}
              {product.collections.map((collection, index) => (
                <span key={collection.slug}>
                  {index > 0 && ', '}
                  <Link to={`/collections/${collection.slug}`} className="link-underlined text-ink">
                    {collection.name}
                  </Link>
                </span>
              ))}
            </p>
          )}
        </motion.div>
      </div>

      {product.completeTheLook && <CompleteTheLook look={product.completeTheLook} current={product.id} />}

      <div className="shell" id="reviews">
        <Reviews product={product} />

        {product.related.length > 0 && (
          <section className="border-t border-mist py-16 md:py-24" aria-labelledby="related-heading">
            <h2 id="related-heading" className="display mb-10 text-4xl md:mb-14 md:text-5xl">
              You may also like
            </h2>
            <ProductGrid products={product.related} />
          </section>
        )}
      </div>

      {/* Mobile: a sticky bar keeps "Add to bag" within reach while reading further down */}
      {!(variant && soldOut) && (
        <div
          className={cx(
            'fixed inset-x-0 bottom-0 z-40 flex items-center gap-4 border-t border-mist bg-paper px-5 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 transition-transform duration-500 ease-out-expo md:hidden',
            buyBarVisible ? 'translate-y-full' : 'translate-y-0',
          )}
          aria-hidden={buyBarVisible}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{product.name}</p>
            <p className="text-[0.8125rem] text-graphite">
              {naira(product.price)}
              {variant && ` · ${colour} / ${size}`}
            </p>
          </div>
          <Button size="sm" className="h-12" onClick={() => add('bag')} loading={busy === 'bag'} tabIndex={buyBarVisible ? -1 : 0}>
            {variant ? 'Add to bag' : 'Select size'}
          </Button>
        </div>
      )}
    </>
  );
};

const Product = () => {
  const { slug } = useParams();
  const { data: product, loading, error, reload } = useFetch(`/products/${slug}`);

  if (loading) return <ProductSkeleton />;
  if (error?.status === 404) {
    return (
      <StateMessage
        eyebrow="Not found"
        title="We couldn’t find that piece."
        body="It may have sold out for good, or the link might be out of date."
      >
        <Seo title="Piece not found" noindex />
        <Button to="/shop">Shop all pieces</Button>
        <Button variant="outline" to="/collections">
          View collections
        </Button>
      </StateMessage>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  // Keyed so the colour/size selection resets when moving between products
  return <ProductDetails key={product.id} product={product} />;
};

export default Product;
