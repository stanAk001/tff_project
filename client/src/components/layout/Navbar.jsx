import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { useAuth, useCart, useCategories, useSettings, useUi, useWishlist } from '../../context/StoreContext.jsx';
import { cx } from '../../utils/format.js';
import { BagIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from '../ui/Icons.jsx';

const NAV = [
  { label: 'Shop', to: '/shop', menu: true },
  { label: 'Collections', to: '/collections' },
  { label: 'Lookbook', to: '/lookbook' },
];

const SHOP_LINKS = [
  { label: 'All pieces', to: '/shop' },
  { label: 'New arrivals', to: '/shop?sort=newest' },
  { label: 'Men', to: '/shop?gender=MEN' },
  { label: 'Women', to: '/shop?gender=WOMEN' },
];

const IconButton = ({ label, children, ...rest }) => (
  <button type="button" aria-label={label} className="relative flex size-10 items-center justify-center" {...rest}>
    {children}
  </button>
);

const Navbar = () => {
  const { pathname } = useLocation();
  const settings = useSettings();
  const categories = useCategories();
  const { customer } = useAuth();
  const { cart } = useCart();
  const wishlist = useWishlist();
  const ui = useUi();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [shopOpen, setShopOpen] = useState(false);
  const announcement = settings?.store.announcement;

  // The bar steps out of the way while reading down the page and returns the
  // moment the visitor scrolls back up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      if (Math.abs(y - last) > 6) {
        setHidden(y > last && y > 240);
        last = y;
      }
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setShopOpen(false);
    setHidden(false);
  }, [pathname]);

  const tucked = hidden && !shopOpen && !ui.overlay;

  // Sticky elements elsewhere (shop filters, product details) follow the bar
  useEffect(() => {
    document.documentElement.style.setProperty('--nav-offset', tucked ? '0px' : announcement ? '6rem' : '4rem');
  }, [tucked, announcement]);

  // Over the homepage hero the bar is transparent until the visitor scrolls
  const overHero = pathname === '/' && !scrolled && !shopOpen;

  return (
    <header
      className={cx('fixed inset-x-0 top-0 z-50 transition-transform duration-500 ease-out-expo', tucked && '-translate-y-full')}
      onMouseLeave={() => setShopOpen(false)}
    >
      {announcement && (
        <p className="eyebrow flex h-8 items-center justify-center bg-ink px-4 text-center text-[0.625rem] text-paper">
          <span className="truncate">{announcement}</span>
        </p>
      )}

      <div
        className={cx(
          'transition-colors duration-500',
          overHero ? 'bg-transparent text-paper' : 'border-b border-mist bg-paper text-ink',
          overHero && 'border-b border-transparent',
        )}
      >
        <nav className="shell grid h-16 grid-cols-[1fr_auto_1fr] items-center" aria-label="Main">
          {/* Left: links on desktop, menu button on mobile */}
          <div className="flex items-center">
            <div className="-ml-2 lg:hidden">
              <IconButton label="Open menu" onClick={() => ui.open('menu')}>
                <MenuIcon />
              </IconButton>
            </div>
            <ul className="hidden items-center gap-9 lg:flex">
              {NAV.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className="eyebrow link py-2"
                    onMouseEnter={() => setShopOpen(Boolean(item.menu))}
                    onFocus={() => setShopOpen(Boolean(item.menu))}
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>

          <Link to="/" className="wordmark px-2 text-[2rem] md:text-[2.25rem]" aria-label="TFF — home">
            TFF
          </Link>

          <div className="-mr-2 flex items-center justify-end md:gap-1">
            <IconButton label="Search" onClick={() => ui.open('search')}>
              <SearchIcon />
            </IconButton>
            <Link
              to={customer ? '/account' : '/login'}
              aria-label={customer ? 'Your account' : 'Sign in'}
              className="hidden size-10 items-center justify-center md:flex"
            >
              <UserIcon />
            </Link>
            <Link to="/wishlist" aria-label={`Wishlist, ${wishlist.items.length} saved`} className="relative hidden size-10 items-center justify-center md:flex">
              <HeartIcon filled={wishlist.items.length > 0} />
            </Link>
            <IconButton label={`Bag, ${cart.itemCount} ${cart.itemCount === 1 ? 'item' : 'items'}`} onClick={() => ui.open('cart')}>
              <BagIcon />
              {cart.itemCount > 0 && (
                // Keyed by the count, so it pops each time something is added
                <motion.span
                  key={cart.itemCount}
                  initial={{ scale: 1.8 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 18 }}
                  className="absolute right-0.5 top-1 flex size-4 items-center justify-center rounded-full bg-current text-[0.5625rem] font-medium tabular-nums"
                >
                  <span className={overHero ? 'text-ink' : 'text-paper'}>{cart.itemCount}</span>
                </motion.span>
              )}
            </IconButton>
          </div>
        </nav>

        {/* Desktop shop menu */}
        <AnimatePresence>
          {shopOpen && (
            <motion.div
              className="absolute inset-x-0 top-full hidden overflow-hidden border-b border-mist bg-paper text-ink lg:block"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="shell grid grid-cols-4 gap-10 py-12">
                <div>
                  <p className="eyebrow mb-5 text-stone">Shop</p>
                  <ul className="space-y-2">
                    {SHOP_LINKS.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} className="display link text-2xl">
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-2">
                  <p className="eyebrow mb-5 text-stone">Categories</p>
                  <ul className="grid grid-cols-2 gap-x-10 gap-y-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Link to={`/shop?category=${category.slug}`} className="display link text-2xl">
                          {category.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="eyebrow mb-5 text-stone">Discover</p>
                  <ul className="space-y-2">
                    <li>
                      <Link to="/collections" className="display link text-2xl">
                        Drops
                      </Link>
                    </li>
                    <li>
                      <Link to="/lookbook" className="display link text-2xl">
                        Lookbook
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </header>
  );
};

export default Navbar;
