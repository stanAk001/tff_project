import { useCallback, useState } from 'react';
import { cx } from '../../utils/format.js';
import ProductCard from './ProductCard.jsx';
import QuickAdd from './QuickAdd.jsx';

// Gives any list of product cards a working "quick add" without each page wiring it up.
export const useQuickAdd = () => {
  const [product, setProduct] = useState(null);
  const [open, setOpen] = useState(false);
  const show = useCallback((next) => {
    setProduct(next);
    setOpen(true);
  }, []);
  const element = <QuickAdd product={product} open={open} onClose={() => setOpen(false)} />;
  return [show, element];
};

// `editorial` leads with the first piece shown large, the next four beside it —
// used where a collection should read like a campaign rather than a catalogue.
const ProductGrid = ({ products, className, priorityCount = 0, editorial = false }) => {
  const [quickAdd, quickAddModal] = useQuickAdd();
  const featured = editorial && products.length >= 5;
  return (
    <>
      <ul
        className={cx(
          'grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-14',
          featured ? 'lg:grid-cols-4' : 'lg:grid-cols-3 xl:grid-cols-4',
          className,
        )}
      >
        {products.map((product, index) => {
          const lead = featured && index === 0;
          return (
            <li key={product.id} className={cx(lead && 'col-span-2 lg:row-span-2')}>
              <ProductCard
                product={product}
                onQuickAdd={quickAdd}
                priority={index < priorityCount}
                sizes={lead ? '(min-width: 1024px) 50vw, 100vw' : undefined}
              />
            </li>
          );
        })}
      </ul>
      {quickAddModal}
    </>
  );
};

export default ProductGrid;
