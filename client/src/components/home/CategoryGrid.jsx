import { useState } from 'react';
import { Link } from 'react-router';
import { cx } from '../../utils/format.js';
import { ArrowIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';
import { Reveal } from '../ui/Reveal.jsx';

// Placeholder tones step through the neutral palette so the row has rhythm before photos exist
const TONES = ['#2a2a2a', '#8b867d', '#d9d4ca', '#55524d', '#c4bdb0', '#1b1a18'];

const CategoryCard = ({ category, index, active, onActivate }) => (
  <Link
    to={`/shop?category=${category.slug}`}
    onMouseEnter={onActivate}
    onFocus={onActivate}
    className={cx(
      'group relative block h-full shrink-0 snap-start overflow-hidden text-paper',
      // Mobile: a swipeable row of cards. Desktop: the hovered card widens and the others give way.
      'w-[72vw] sm:w-[44vw] lg:w-auto lg:min-w-0 lg:basis-0 lg:transition-[flex-grow] lg:duration-700 lg:ease-out-expo',
      active ? 'lg:grow-[2.2]' : 'lg:grow',
    )}
  >
    <Media
      src={category.videoUrl || category.imageUrl}
      type={category.videoUrl ? 'VIDEO' : 'IMAGE'}
      poster={category.imageUrl}
      alt=""
      tone={TONES[index % TONES.length]}
      label={`${category.name} category image`}
      placeholderLabelTop
      quietPlaceholder
      sizes="(min-width: 1024px) 40vw, 72vw"
      className="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-105"
    />
    <div className="absolute inset-0 bg-ink/20 transition-colors duration-500 group-hover:bg-ink/30" aria-hidden="true" />
    <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 md:p-6">
      <h3 className="display text-3xl lg:text-2xl xl:text-3xl">{category.name}</h3>
      <span className={cx('eyebrow flex items-center gap-2 pb-1.5 text-[0.625rem] transition-opacity duration-500', !active && 'lg:opacity-0')}>
        Shop
        <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
          <ArrowIcon size={12} />
        </span>
      </span>
    </div>
  </Link>
);

const CategoryGrid = ({ content, categories }) => {
  const [active, setActive] = useState(0);
  if (!categories?.length) return null;

  return (
    <section className="py-20 md:py-28" aria-labelledby="categories-heading">
      <Reveal className="shell mb-10 flex items-end justify-between gap-6 md:mb-12">
        <div>
          {content.eyebrow && <p className="eyebrow mb-4 text-stone">{content.eyebrow}</p>}
          <h2 id="categories-heading" className="display text-4xl md:text-6xl">
            {content.heading || 'Shop by category'}
          </h2>
        </div>
        <Link to="/shop" className="eyebrow link-underlined hidden shrink-0 sm:inline">
          View all
        </Link>
      </Reveal>

      <div
        className="no-scrollbar flex h-[26rem] snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:h-[34rem] md:px-10 lg:gap-4 lg:overflow-visible xl:px-14"
        onMouseLeave={() => setActive(0)}
      >
        {categories.map((category, index) => (
          <CategoryCard
            key={category.id}
            category={category}
            index={index}
            active={index === active}
            onActivate={() => setActive(index)}
          />
        ))}
      </div>
    </section>
  );
};

export default CategoryGrid;
