import { cx } from '../../utils/format.js';
import ProductCard from '../product/ProductCard.jsx';
import { useQuickAdd } from '../product/ProductGrid.jsx';
import Button from '../ui/Button.jsx';
import { Reveal } from '../ui/Reveal.jsx';

// Each position gets its own proportion and offset, so the group reads as an
// editorial spread rather than a uniform grid.
const LAYOUT = [
  { ratio: 'aspect-[3/4]', offset: '' },
  { ratio: 'aspect-[4/5]', offset: 'mt-16 md:mt-32' },
  { ratio: 'aspect-[4/5]', offset: 'md:-mt-8' },
  { ratio: 'aspect-[3/4]', offset: 'mt-16 md:mt-24' },
];

const NewDrop = ({ content, products }) => {
  const [quickAdd, quickAddModal] = useQuickAdd();
  if (!products.length) return null;

  return (
    <section className="shell py-24 md:py-40">
      <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-4">
          <div className="lg:sticky lg:top-36">
            <Reveal>
              {content.eyebrow && <p className="eyebrow mb-6 text-stone">{content.eyebrow}</p>}
              <h2 className="display text-5xl italic md:text-6xl xl:text-7xl">{content.heading}</h2>
              {content.body && <p className="mt-7 max-w-sm text-graphite">{content.body}</p>}
              {content.ctaLabel && (
                <Button to={content.ctaHref || '/shop'} className="mt-9">
                  {content.ctaLabel}
                </Button>
              )}
            </Reveal>
          </div>
        </div>

        <ul className="grid grid-cols-2 gap-x-3 gap-y-12 md:gap-x-6 lg:col-span-7 lg:col-start-6">
          {products.slice(0, 4).map((product, index) => {
            const layout = LAYOUT[index % LAYOUT.length];
            return (
              <li key={product.id} className={cx(layout.offset)}>
                <Reveal delay={(index % 2) * 0.12}>
                  <ProductCard
                    product={product}
                    onQuickAdd={quickAdd}
                    ratio={layout.ratio}
                    sizes="(min-width: 1024px) 28vw, 50vw"
                  />
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
      {quickAddModal}
    </section>
  );
};

export default NewDrop;
