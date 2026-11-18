import { useState } from 'react';
import { LookImage, LookProductList } from '../components/ShopTheLook.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorState, Skeleton, StateMessage } from '../components/ui/Feedback.jsx';
import Modal from '../components/ui/Modal.jsx';
import { ImageReveal, Reveal, TextReveal } from '../components/ui/Reveal.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo } from '../hooks/useSeo.js';
import { cx } from '../utils/format.js';

// How each layout choice (set per image in the admin) sits on the 12-column page.
// The offsets alternate so the sequence feels composed rather than stacked.
const LAYOUTS = {
  FULL: { wrap: 'col-span-12 -mx-5 md:-mx-10 xl:-mx-14', ratio: 'aspect-[4/5] md:aspect-[16/9]', sizes: '100vw' },
  WIDE: { wrap: 'col-span-12 md:col-span-9', ratio: 'aspect-[4/3] md:aspect-[3/2]', sizes: '(min-width: 768px) 75vw, 100vw' },
  TALL: { wrap: 'col-span-9 md:col-span-5', ratio: 'aspect-[3/4]', sizes: '(min-width: 768px) 42vw, 75vw' },
  HALF: { wrap: 'col-span-8 md:col-span-5', ratio: 'aspect-[4/5]', sizes: '(min-width: 768px) 42vw, 66vw' },
};
const TONES = ['#2a2a2a', '#a9a397', '#55524d', '#d0c9bc', '#3a3835', '#8b867d'];

const LookbookItem = ({ item, index, onShop }) => {
  const layout = LAYOUTS[item.layout] || LAYOUTS.FULL;
  const [active, setActive] = useState(null);
  // Alternate narrower images between the left and right of the page
  const pushRight = item.layout !== 'FULL' && index % 2 === 1;
  const drop = item.layout === 'HALF' || item.layout === 'TALL';

  return (
    <figure
      className={cx(layout.wrap, pushRight && (item.layout === 'WIDE' ? 'md:col-start-4' : 'col-start-4 md:col-start-8'), drop && index % 2 === 1 && 'md:mt-32')}
      onMouseLeave={() => setActive(null)}
    >
      <ImageReveal>
        <LookImage look={item} active={active} onActive={setActive} sizes={layout.sizes} tone={TONES[index % TONES.length]} className={layout.ratio} />
      </ImageReveal>
      <figcaption className={cx('mt-4 flex items-baseline justify-between gap-4', item.layout === 'FULL' && 'px-5 md:px-10 xl:px-14')}>
        <span className="eyebrow text-[0.625rem] text-graphite">{item.caption || `Look ${String(index + 1).padStart(2, '0')}`}</span>
        {item.products.length > 0 && (
          <button type="button" onClick={() => onShop(item)} className="eyebrow link-underlined shrink-0 text-[0.625rem]">
            Shop the look ({item.products.length})
          </button>
        )}
      </figcaption>
    </figure>
  );
};

const Lookbook = () => {
  const { data: lookbooks, loading, error, reload } = useFetch('/lookbooks');
  const [shopping, setShopping] = useState(null);

  if (loading) {
    return (
      <div className="shell py-16" role="status" aria-label="Loading lookbook">
        <Skeleton className="h-24 w-2/3" />
        <Skeleton className="mt-12 aspect-[16/9] w-full" />
      </div>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  return (
    <>
      <Seo title="Lookbook" description="The TFF lookbook — every collection, photographed the way it was designed to be worn." />

      {lookbooks.length === 0 ? (
        <StateMessage eyebrow="Lookbook" title="The first lookbook is being shot." body="Check back soon — or explore the collection in the meantime.">
          <Button to="/shop">Shop all pieces</Button>
        </StateMessage>
      ) : (
        lookbooks.map((lookbook, bookIndex) => (
          <article key={lookbook.id} className={cx('shell pb-24 md:pb-40', bookIndex === 0 ? 'pt-12 md:pt-20' : 'border-t border-mist pt-24 md:pt-40')}>
            <header className="mb-14 grid gap-8 md:mb-24 md:grid-cols-12">
              <div className="md:col-span-8">
                <p className="eyebrow mb-5 text-stone">{['Lookbook', lookbook.season].filter(Boolean).join(' — ')}</p>
                <TextReveal
                  as={bookIndex === 0 ? 'h1' : 'h2'}
                  immediate={bookIndex === 0}
                  text={lookbook.title}
                  className="display text-[clamp(3.5rem,13vw,12rem)] italic leading-[0.9]"
                />
              </div>
              {lookbook.description && (
                <Reveal className="self-end md:col-span-4" delay={0.2}>
                  <p className="max-w-sm text-graphite">{lookbook.description}</p>
                </Reveal>
              )}
            </header>

            {lookbook.items.length === 0 ? (
              <p className="text-graphite">Images for this lookbook are coming soon.</p>
            ) : (
              <div className="grid grid-cols-12 gap-x-3 gap-y-16 md:gap-x-6 md:gap-y-32">
                {lookbook.items.map((item, index) => (
                  <LookbookItem key={item.id} item={item} index={index} onShop={setShopping} />
                ))}
              </div>
            )}
          </article>
        ))
      )}

      <Modal open={Boolean(shopping)} onClose={() => setShopping(null)} side="right" title="Shop the look">
        {shopping && (
          <div className="px-5 py-6 md:px-8">
            <p className="display mb-6 text-3xl">{shopping.caption || 'In this look'}</p>
            <LookProductList look={shopping} active={null} onActive={() => {}} />
          </div>
        )}
      </Modal>
    </>
  );
};

export default Lookbook;
