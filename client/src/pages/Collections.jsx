import { motion, useReducedMotion, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link, useParams } from 'react-router';
import Countdown from '../components/Countdown.jsx';
import ProductGrid from '../components/product/ProductGrid.jsx';
import Button from '../components/ui/Button.jsx';
import { ErrorState, ProductGridSkeleton, Skeleton, StateMessage } from '../components/ui/Feedback.jsx';
import { ArrowIcon } from '../components/ui/Icons.jsx';
import Media from '../components/ui/Media.jsx';
import { ImageReveal, Reveal, TextReveal } from '../components/ui/Reveal.jsx';
import { NewsletterForm } from '../components/Newsletter.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Seo } from '../hooks/useSeo.js';
import { useCountdown } from '../hooks/useUi.js';
import { useSectionScroll } from '../hooks/useSectionScroll.js';
import { cx, dropLabel, formatDate } from '../utils/format.js';

const STATUS_LABEL = { UPCOMING: 'Coming soon', ACTIVE: 'Available now', ARCHIVED: 'Archive' };
const TONES = ['#2a2a2a', '#8b867d', '#c4bdb0', '#55524d'];

const stripDrop = (name) => name.replace(/^Drop \d+\s*[—-]\s*/i, '');
const isLocked = (collection) =>
  collection.status === 'UPCOMING' && collection.launchDate && new Date(collection.launchDate) > new Date();

// ── Collection card (index page) ─────────────────────────────────────────

export const CollectionCard = ({ collection, index = 0, wide = false }) => {
  const locked = isLocked(collection);
  return (
    <Link to={`/collections/${collection.slug}`} className="group block">
      <ImageReveal className={cx('relative overflow-hidden', wide ? 'aspect-[4/5] md:aspect-[16/9]' : 'aspect-[4/5]')}>
        <Media
          src={collection.coverImageUrl}
          alt=""
          tone={TONES[index % TONES.length]}
          label={`${collection.name} cover`}
          sizes={wide ? '100vw' : '(min-width: 768px) 50vw, 100vw'}
          className="transition-transform duration-[1400ms] ease-out-expo group-hover:scale-[1.04]"
        />
        {collection.isDrop && collection.dropNumber && !locked && (
          <span className="wordmark pointer-events-none absolute bottom-3 left-4 text-[clamp(4rem,9vw,9rem)] text-paper mix-blend-difference md:left-6" aria-hidden="true">
            {String(collection.dropNumber).padStart(3, '0')}
          </span>
        )}
        {collection.status !== 'ACTIVE' && (
          <span className="eyebrow absolute left-4 top-4 bg-paper px-3 py-2.5 text-[0.5625rem] text-ink">
            {STATUS_LABEL[collection.status]}
          </span>
        )}
        {locked && (
          <div className="absolute inset-x-0 bottom-0 bg-ink/80 p-5 text-paper md:p-6">
            <Countdown to={collection.launchDate} size="sm" />
          </div>
        )}
      </ImageReveal>
      <div className="mt-5 flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow mb-2.5 text-[0.625rem] text-stone">
            {[dropLabel(collection), locked ? `Launches ${formatDate(collection.launchDate, { day: 'numeric', month: 'long' })}` : `${collection.productCount} pieces`]
              .filter(Boolean)
              .join(' — ')}
          </p>
          <h2 className="display text-4xl md:text-5xl">{stripDrop(collection.name)}</h2>
        </div>
        <span className="mt-8 transition-transform duration-500 ease-out-expo group-hover:translate-x-1.5">
          <ArrowIcon size={20} />
        </span>
      </div>
    </Link>
  );
};

// ── /collections ─────────────────────────────────────────────────────────

export const Collections = () => {
  const { data: collections, loading, error, reload } = useFetch('/collections');

  return (
    <div className="shell pb-24 pt-10 md:pb-32 md:pt-16">
      <Seo title="Collections & Drops" description="Every TFF collection and limited drop — past, present and coming soon." />
      <header className="mb-12 md:mb-20">
        <p className="eyebrow mb-4 text-stone">Collections</p>
        <h1 className="display text-5xl md:text-8xl">Drops &amp; collections</h1>
      </header>

      {loading && (
        <div className="grid gap-x-6 gap-y-16 md:grid-cols-2" role="status" aria-label="Loading collections">
          <Skeleton className="aspect-[16/9] md:col-span-2" />
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      )}
      {error && <ErrorState error={error} onRetry={reload} />}
      {collections?.length === 0 && (
        <StateMessage eyebrow="Coming soon" title="The first drop is on its way." body="Join the list to hear the moment it lands.">
          <Button to="/shop">Shop all pieces</Button>
        </StateMessage>
      )}
      {collections?.length > 0 && (
        <ul className="grid gap-x-6 gap-y-16 md:grid-cols-2 md:gap-y-24">
          {collections.map((collection, index) => (
            <li key={collection.id} className={cx(index === 0 && 'md:col-span-2', index % 2 === 0 && index > 0 && 'md:mt-24')}>
              <CollectionCard collection={collection} index={index} wide={index === 0} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// ── /collections/:slug ───────────────────────────────────────────────────

// A drop opens like its own campaign: full-bleed film or photograph, the drop
// number set huge ("Drop 001."), the collection's name beneath it in italic.
const CollectionHero = ({ collection, locked }) => {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const scrollYProgress = useSectionScroll(ref, ['start start', 'end start']);
  const push = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.1]);
  const fade = useTransform(scrollYProgress, [0, 0.6], [1, reduced ? 1 : 0]);
  const drop = collection.isDrop && collection.dropNumber ? `Drop ${String(collection.dropNumber).padStart(3, '0')}.` : null;

  return (
    <section ref={ref} className="relative flex h-[88svh] min-h-[34rem] flex-col justify-end overflow-hidden bg-ink text-paper">
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { clipPath: 'inset(10% 6% 10% 6%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <motion.div className="absolute inset-0" style={{ scale: push }}>
          <Media
            src={collection.coverVideoUrl || collection.coverImageUrl}
            type={collection.coverVideoUrl ? 'VIDEO' : 'IMAGE'}
            poster={collection.coverImageUrl}
            alt=""
            tone="#1b1a18"
            label={`${collection.name} cover image or film`}
            quietPlaceholder
            sizes="100vw"
            priority
            autoPlayOnMobile
            toggleClassName="bottom-6 right-5 md:right-10 xl:right-14"
          />
        </motion.div>
        <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
      </motion.div>

      <motion.div className="shell relative pb-14 md:pb-16" style={{ opacity: fade }}>
        <p className="eyebrow mb-5">{STATUS_LABEL[locked ? 'UPCOMING' : collection.status]}</p>
        {drop ? (
          <h1>
            <TextReveal as="span" immediate delay={0.4} text={drop} className="wordmark block text-[clamp(4.5rem,15vw,15rem)]" />
            <TextReveal
              as="span"
              immediate
              delay={0.6}
              text={stripDrop(collection.name)}
              className="display mt-3 block text-[clamp(2rem,4.5vw,4.5rem)] italic"
            />
          </h1>
        ) : (
          <TextReveal immediate delay={0.4} text={collection.name} className="display max-w-[14ch] text-[clamp(3.25rem,8vw,8rem)]" />
        )}
      </motion.div>
    </section>
  );
};

// The collection's idea, given room before the products start
const CollectionIntro = ({ collection, count }) => (
  <section className="shell grid gap-8 border-b border-mist py-16 md:grid-cols-12 md:py-24">
    <Reveal className="md:col-span-3">
      <p className="eyebrow text-stone">{dropLabel(collection) || 'Collection'}</p>
      <p className="mt-3 text-sm text-graphite">
        {count} {count === 1 ? 'piece' : 'pieces'}
        {collection.launchDate && ` · ${formatDate(collection.launchDate, { month: 'long', year: 'numeric' })}`}
      </p>
    </Reveal>
    {collection.description && (
      <Reveal className="md:col-span-8 md:col-start-5" delay={0.1}>
        <p className="display text-[clamp(1.75rem,3.2vw,3rem)] leading-[1.15]">{collection.description}</p>
      </Reveal>
    )}
  </section>
);

// Reloads the collection the moment the countdown reaches zero, revealing the pieces
const LaunchGate = ({ collection, onLaunch }) => {
  const remaining = useCountdown(collection.launchDate);
  if (!remaining) {
    return (
      <StateMessage eyebrow="It’s time" title="The drop is live.">
        <Button onClick={onLaunch}>Shop the drop</Button>
      </StateMessage>
    );
  }
  return (
    <section className="shell grid gap-12 py-20 md:grid-cols-2 md:py-28">
      <Reveal>
        <p className="eyebrow mb-6 text-stone">
          Launches {formatDate(collection.launchDate, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
        </p>
        <Countdown to={collection.launchDate} />
        <p className="mt-8 max-w-sm text-graphite">
          {collection.productCount} {collection.productCount === 1 ? 'piece' : 'pieces'}, released in a limited run. They stay under wraps until launch.
        </p>
      </Reveal>
      <Reveal delay={0.1} className="md:pt-2">
        <h2 className="display text-4xl md:text-5xl">Be first in line.</h2>
        <p className="mt-4 max-w-sm text-graphite">Join the list and we’ll email you the moment this drop goes live.</p>
        <NewsletterForm className="mt-6 max-w-md" />
      </Reveal>
    </section>
  );
};

export const Collection = () => {
  const { slug } = useParams();
  const { data: collection, loading, error, reload } = useFetch(`/collections/${slug}`);

  if (loading) {
    return (
      <div role="status" aria-label="Loading collection">
        <Skeleton className="h-[72svh] w-full" />
        <div className="shell py-16">
          <ProductGridSkeleton count={4} />
        </div>
      </div>
    );
  }
  if (error?.status === 404) {
    return (
      <StateMessage eyebrow="Not found" title="We couldn’t find that collection." body="It may have been retired. Every current drop is on the collections page.">
        <Seo title="Collection not found" noindex />
        <Button to="/collections">View collections</Button>
      </StateMessage>
    );
  }
  if (error) return <ErrorState error={error} onRetry={reload} />;

  const locked = isLocked(collection);

  return (
    <>
      <Seo
        title={collection.seoTitle || collection.name}
        description={collection.seoDescription || collection.description}
        image={collection.coverImageUrl}
      />
      <CollectionHero collection={collection} locked={locked} />

      {locked ? (
        <LaunchGate collection={collection} onLaunch={reload} />
      ) : (
        <>
        <CollectionIntro collection={collection} count={collection.products.length} />
        <section className="shell py-14 md:py-24" aria-label="The pieces">
          {collection.products.length > 0 ? (
            <ProductGrid products={collection.products} priorityCount={5} editorial />
          ) : (
            <StateMessage
              eyebrow={collection.status === 'ARCHIVED' ? 'Archive' : 'Nothing here yet'}
              title={collection.status === 'ARCHIVED' ? 'This drop has sold through.' : 'Pieces are on their way.'}
            >
              <Button to="/shop">Shop all pieces</Button>
            </StateMessage>
          )}
        </section>
        </>
      )}
    </>
  );
};
