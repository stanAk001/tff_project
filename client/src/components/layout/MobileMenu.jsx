import { motion } from 'motion/react';
import { Link } from 'react-router';
import { useAuth, useCategories, useUi, useWishlist } from '../../context/StoreContext.jsx';
import Modal from '../ui/Modal.jsx';

const PRIMARY = [
  { label: 'Shop all', to: '/shop' },
  { label: 'New arrivals', to: '/shop?sort=newest' },
  { label: 'Men', to: '/shop?gender=MEN' },
  { label: 'Women', to: '/shop?gender=WOMEN' },
  { label: 'Collections', to: '/collections' },
  { label: 'Lookbook', to: '/lookbook' },
];

const MobileMenu = () => {
  const ui = useUi();
  const categories = useCategories();
  const { customer } = useAuth();
  const wishlist = useWishlist();

  return (
    <Modal open={ui.overlay === 'menu'} onClose={ui.close} side="left" title="Menu">
      <nav className="flex flex-1 flex-col px-5 py-8" aria-label="Mobile">
        <ul className="space-y-1">
          {PRIMARY.map((item, index) => (
            <motion.li
              key={item.to}
              className="overflow-hidden"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 + index * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={item.to} className="display block py-1.5 text-[2.5rem]">
                {item.label}
              </Link>
            </motion.li>
          ))}
        </ul>

        {categories.length > 0 && (
          <>
            <p className="eyebrow mb-4 mt-10 text-stone">Categories</p>
            <ul className="grid grid-cols-2 gap-x-6">
              {categories.map((category) => (
                <li key={category.id}>
                  <Link to={`/shop?category=${category.slug}`} className="block py-2.5 text-base">
                    {category.name}
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}

        <ul className="mt-auto space-y-1 border-t border-mist pt-6">
          <li>
            <Link to={customer ? '/account' : '/login'} className="eyebrow block py-3">
              {customer ? 'My account' : 'Sign in'}
            </Link>
          </li>
          <li>
            <Link to="/wishlist" className="eyebrow block py-3">
              Wishlist{wishlist.items.length ? ` (${wishlist.items.length})` : ''}
            </Link>
          </li>
          <li>
            <Link to="/track" className="eyebrow block py-3">
              Track an order
            </Link>
          </li>
        </ul>
      </nav>
    </Modal>
  );
};

export default MobileMenu;
