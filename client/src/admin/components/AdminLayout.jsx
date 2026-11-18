import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { CloseIcon, MenuIcon } from '../../components/ui/Icons.jsx';
import { cx } from '../../utils/format.js';
import { useAdmin } from '../AdminApp.jsx';

// Grouped the way an owner thinks about the business, in plain words
const NAV = [
  {
    items: [{ to: '/admin', label: 'Overview', end: true }],
  },
  {
    title: 'Sell',
    items: [
      { to: '/admin/orders', label: 'Orders' },
      { to: '/admin/customers', label: 'Customers' },
      { to: '/admin/discounts', label: 'Discounts' },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/admin/products', label: 'Products' },
      { to: '/admin/inventory', label: 'Inventory' },
      { to: '/admin/categories', label: 'Categories' },
      { to: '/admin/collections', label: 'Collections & drops' },
    ],
  },
  {
    title: 'Storefront',
    items: [
      { to: '/admin/homepage', label: 'Homepage' },
      { to: '/admin/lookbook', label: 'Lookbook' },
      { to: '/admin/reviews', label: 'Reviews' },
      { to: '/admin/newsletter', label: 'Newsletter' },
    ],
  },
  {
    items: [{ to: '/admin/settings', label: 'Settings' }],
  },
];

const Sidebar = ({ onNavigate }) => {
  const { admin, logout } = useAdmin();
  return (
    <div className="flex h-full flex-col bg-ink text-paper">
      <div className="flex h-16 shrink-0 items-center justify-between px-6">
        <Link to="/admin" className="flex items-baseline gap-3" onClick={onNavigate}>
          <span className="wordmark text-[1.75rem]">TFF</span>
          <span className="eyebrow text-[0.5625rem] text-paper/50">Admin</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6" aria-label="Admin">
        {NAV.map((group, index) => (
          <div key={index} className="mt-5 first:mt-2">
            {group.title && <p className="eyebrow mb-2 px-3 text-[0.5625rem] text-paper/40">{group.title}</p>}
            <ul>
              {group.items.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      cx(
                        'block px-3 py-2 text-sm transition-colors',
                        isActive ? 'bg-paper/10 font-medium text-paper' : 'text-paper/65 hover:text-paper',
                      )
                    }
                  >
                    {item.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="shrink-0 border-t border-paper/15 p-5 text-sm">
        <p className="truncate font-medium">{admin.name}</p>
        <p className="truncate text-[0.8125rem] text-paper/50">{admin.email}</p>
        <div className="mt-4 flex gap-5">
          <a href="/" target="_blank" rel="noreferrer" className="link text-[0.8125rem]">
            View store
          </a>
          <button type="button" onClick={logout} className="link text-[0.8125rem]">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

const AdminLayout = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-paper">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 lg:block">
        <Sidebar />
      </aside>

      {/* Mobile top bar + slide-over menu */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between bg-ink px-4 text-paper lg:hidden">
        <Link to="/admin" className="flex items-baseline gap-3">
          <span className="wordmark text-2xl">TFF</span>
          <span className="eyebrow text-[0.5625rem] text-paper/50">Admin</span>
        </Link>
        <button type="button" className="flex size-10 items-center justify-center" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
          <MenuIcon />
        </button>
      </header>
      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin menu">
          <button type="button" className="absolute inset-0 bg-ink/50" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw]">
            <Sidebar onNavigate={() => setMenuOpen(false)} />
            <button type="button" className="absolute right-3 top-3 flex size-10 items-center justify-center text-paper" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
              <CloseIcon />
            </button>
          </div>
        </div>
      )}

      <main className="lg:pl-60">
        <div className="mx-auto max-w-[78rem] px-4 py-8 md:px-8 md:py-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
