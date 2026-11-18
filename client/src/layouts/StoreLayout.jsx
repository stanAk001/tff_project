import { motion, useReducedMotion } from 'motion/react';
import { useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import CartDrawer from '../components/layout/CartDrawer.jsx';
import Footer from '../components/layout/Footer.jsx';
import MobileMenu from '../components/layout/MobileMenu.jsx';
import Navbar from '../components/layout/Navbar.jsx';
import SearchOverlay from '../components/layout/SearchOverlay.jsx';
import { useSettings } from '../context/StoreContext.jsx';
import { cx } from '../utils/format.js';

// Each new page starts at the top (but changing filters on the same page doesn't jump)
export const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// A short fade as each page arrives
export const PageTransition = ({ children }) => {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
};

const StoreLayout = () => {
  const { pathname } = useLocation();
  const settings = useSettings();
  const hasAnnouncement = Boolean(settings?.store.announcement);
  // The homepage hero runs underneath the navigation; every other page starts below it
  const isHome = pathname === '/';

  return (
    <>
      <a
        href="#main"
        className="eyebrow sr-only z-[100] bg-ink px-5 py-4 text-paper focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
      >
        Skip to content
      </a>
      <Navbar />
      <main
        id="main"
        className={cx('min-h-dvh', !isHome && 'pt-[var(--header-h)]')}
        style={{ '--header-h': hasAnnouncement ? '6rem' : '4rem' }}
      >
        <PageTransition>
          <Outlet />
        </PageTransition>
      </main>
      <Footer />
      <CartDrawer />
      <SearchOverlay />
      <MobileMenu />
    </>
  );
};

// Checkout gets its own stripped-back frame: no navigation, nothing to distract.
export const CheckoutLayout = () => (
  <div className="flex min-h-dvh flex-col">
    <header className="border-b border-mist">
      <div className="shell grid h-16 grid-cols-[1fr_auto_1fr] items-center">
        <Link to="/shop" className="eyebrow link justify-self-start text-graphite">
          <span className="sm:hidden">Back</span>
          <span className="hidden sm:inline">Continue shopping</span>
        </Link>
        <Link to="/" className="wordmark text-[2rem]" aria-label="TFF — home">
          TFF
        </Link>
        <p className="eyebrow justify-self-end text-graphite">
          <span className="sm:hidden">Secure</span>
          <span className="hidden sm:inline">Secure checkout</span>
        </p>
      </div>
    </header>
    <main id="main" className="flex-1">
      <Outlet />
    </main>
    <CartDrawer />
  </div>
);

export default StoreLayout;
