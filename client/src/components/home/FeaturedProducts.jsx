import { motion, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useMediaQuery } from '../../hooks/useUi.js';
import ProductCard from '../product/ProductCard.jsx';
import { useQuickAdd } from '../product/ProductGrid.jsx';
import { ArrowIcon } from '../ui/Icons.jsx';
import { useSectionScroll } from '../../hooks/useSectionScroll.js';
import { Reveal } from '../ui/Reveal.jsx';

const Intro = ({ content, className }) => (
  <div className={className}>
    {content.eyebrow && <p className="eyebrow mb-5 text-stone">{content.eyebrow}</p>}
    <h2 id="featured-heading" className="display text-5xl md:text-7xl">
      {content.heading || 'Featured'}
    </h2>
    {content.ctaLabel && (
      <Link to={content.ctaHref || '/shop'} className="group eyebrow mt-8 inline-flex items-center gap-3">
        <span className="link-underlined">{content.ctaLabel}</span>
        <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
          <ArrowIcon size={14} />
        </span>
      </Link>
    )}
  </div>
);

// Desktop: the section pins and the pieces travel sideways past the reader like a
// runway, driven by the vertical scroll. A thin rule tracks progress.
const Runway = ({ content, products, onQuickAdd }) => {
  const sectionRef = useRef(null);
  const trackRef = useRef(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const measure = () => {
      if (trackRef.current) setDistance(Math.max(0, trackRef.current.scrollWidth - window.innerWidth));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(trackRef.current);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [products.length]);

  const scrollYProgress = useSectionScroll(sectionRef, ['start start', 'end end']);
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.4 });
  const x = useTransform(smooth, [0, 1], [0, -distance]);

  return (
    <section ref={sectionRef} className="relative bg-paper" style={{ height: `calc(100svh + ${distance}px)` }} aria-labelledby="featured-heading">
      <div className="sticky top-0 flex h-svh flex-col justify-center overflow-hidden">
        <motion.ul ref={trackRef} className="flex w-max items-end gap-6 pl-14 pr-[12vw] pt-16" style={{ x }}>
          <li className="flex w-[30vw] max-w-md shrink-0 self-center pr-10">
            <Intro content={content} />
          </li>
          {products.map((product, index) => (
            // Alternating heights give the line of pieces a rhythm, like a styled rail
            <li key={product.id} className={index % 2 ? 'w-[22vw] shrink-0 pb-14' : 'w-[26vw] shrink-0'}>
              <ProductCard product={product} onQuickAdd={onQuickAdd} ratio="aspect-[3/4]" sizes="26vw" />
            </li>
          ))}
        </motion.ul>
        <div className="shell mt-10 flex items-center gap-6">
          <span className="eyebrow text-[0.625rem] text-stone">{String(products.length).padStart(2, '0')} pieces</span>
          <div className="h-px flex-1 bg-mist" aria-hidden="true">
            <motion.div className="h-px origin-left bg-ink" style={{ scaleX: smooth }} />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturedProducts = ({ content, products }) => {
  const [quickAdd, quickAddModal] = useQuickAdd();
  const reduced = useReducedMotion();
  const wide = useMediaQuery('(min-width: 1024px)');
  if (!products.length) return null;

  if (wide && !reduced && products.length >= 4) {
    return (
      <>
        <Runway content={content} products={products} onQuickAdd={quickAdd} />
        {quickAddModal}
      </>
    );
  }

  // Phones, tablets and reduced motion: a swipeable row, then a calm grid
  return (
    <section className="py-20 md:py-28" aria-labelledby="featured-heading">
      <Reveal className="shell mb-10 md:mb-14">
        <Intro content={content} />
      </Reveal>
      <ul className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 md:mx-auto md:grid md:max-w-[1720px] md:grid-cols-3 md:gap-x-5 md:gap-y-14 md:overflow-visible md:px-10">
        {products.map((product) => (
          <li key={product.id} className="w-[66vw] shrink-0 snap-start sm:w-[40vw] md:w-auto">
            <ProductCard product={product} onQuickAdd={quickAdd} sizes="(min-width: 768px) 33vw, 66vw" />
          </li>
        ))}
      </ul>
      {quickAddModal}
    </section>
  );
};

export default FeaturedProducts;
