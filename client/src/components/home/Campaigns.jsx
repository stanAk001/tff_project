import { motion, useReducedMotion, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { cx, dropLabel, formatDate } from '../../utils/format.js';
import Countdown from '../Countdown.jsx';
import Button from '../ui/Button.jsx';
import Media from '../ui/Media.jsx';
import { useSectionScroll } from '../../hooks/useSectionScroll.js';
import { ImageReveal, Reveal } from '../ui/Reveal.jsx';

// ── Featured collection / upcoming drop ──────────────────────────────────

export const FeaturedCollection = ({ content, collections }) => {
  const collection = collections[0];
  if (!collection) return null;
  const upcoming = collection.status === 'UPCOMING' && collection.launchDate && new Date(collection.launchDate) > new Date();

  return (
    <section className="bg-ink text-paper">
      <div className="shell grid items-center gap-12 py-20 md:py-32 lg:grid-cols-2 lg:gap-20">
        <Reveal>
          <p className="eyebrow mb-6 text-paper/60">
            {/* The label follows the launch date by itself: "Coming soon" until it passes, then "Out now" */}
            {[upcoming ? 'Coming soon' : 'Out now', dropLabel(collection)].filter(Boolean).join(' — ')}
          </p>
          <h2 className="display text-5xl md:text-7xl">{collection.name.replace(/^Drop \d+\s*[—-]\s*/i, '')}</h2>
          {collection.description && <p className="mt-6 max-w-md text-paper/70">{collection.description}</p>}

          {upcoming && (
            <>
              <Countdown to={collection.launchDate} className="mt-10" />
              <p className="mt-6 text-sm text-paper/60">
                Launches {formatDate(collection.launchDate, { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </>
          )}

          <Button variant="light" to={`/collections/${collection.slug}`} className="mt-10">
            {upcoming ? content.ctaLabel || 'Preview the drop' : 'Shop the collection'}
          </Button>
        </Reveal>

        <ImageReveal className="relative aspect-[4/5] overflow-hidden">
          <Media
            src={collection.coverVideoUrl || collection.coverImageUrl}
            type={collection.coverVideoUrl ? 'VIDEO' : 'IMAGE'}
            poster={collection.coverImageUrl}
            alt=""
            tone="#2a2a2a"
            label={`${collection.name} cover`}
            sizes="(min-width: 1024px) 50vw, 100vw"
          />
        </ImageReveal>
      </div>
    </section>
  );
};

// ── Campaign banner ──────────────────────────────────────────────────────
// The film starts as a framed window inside the page and opens to full bleed as it
// scrolls into view — the page "cuts" to the campaign rather than just showing it.

export const CampaignBanner = ({ content }) => {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const scrollYProgress = useSectionScroll(ref, ['start end', 'start start']);
  const open = useTransform(scrollYProgress, [0, 0.85], [reduced ? 0 : 1, 0]);
  const clipPath = useTransform(open, (v) => `inset(${v * 14}% ${v * 10}% ${v * 14}% ${v * 10}%)`);
  const scale = useTransform(open, [1, 0], [1.18, 1]);
  const words = useTransform(scrollYProgress, [0.45, 0.95], [reduced ? 1 : 0, 1]);

  return (
    <section ref={ref} className="relative h-svh min-h-[36rem] overflow-hidden bg-paper text-paper">
      <motion.div className="absolute inset-0 bg-ink" style={{ clipPath }}>
        <motion.div className="absolute inset-0" style={{ scale }}>
          <Media
            src={content.mediaUrl}
            type={content.mediaType}
            poster={content.posterUrl}
            alt=""
            tone="#3a3835"
            label="Campaign banner image or film"
            quietPlaceholder
            sizes="100vw"
          />
        </motion.div>
        <div className="absolute inset-0 bg-ink/40" aria-hidden="true" />
      </motion.div>
      <motion.div className="shell relative flex h-full flex-col items-center justify-center text-center" style={{ opacity: words }}>
        <h2 className="display mx-auto max-w-[14ch] text-[clamp(3rem,8vw,8.5rem)] leading-[0.92]">{content.heading}</h2>
        {content.subheading && <p className="mt-6 text-lg italic text-paper/85 md:text-2xl">{content.subheading}</p>}
        {content.ctaLabel && (
          <Button variant="light" to={content.ctaHref || '/shop'} className="mt-10">
            {content.ctaLabel}
          </Button>
        )}
      </motion.div>
    </section>
  );
};

// ── Lookbook teaser ──────────────────────────────────────────────────────

const TEASER_LAYOUT = [
  'col-span-7 aspect-[4/5] md:col-span-5',
  'col-span-5 mt-16 aspect-[3/4] md:col-span-3 md:mt-40',
  'col-span-8 col-start-3 aspect-[16/10] md:col-span-4 md:col-start-auto md:mt-16 md:aspect-[4/5]',
];
const TEASER_TONES = ['#55524d', '#c4bdb0', '#2a2a2a'];

export const LookbookTeaser = ({ content, lookbook }) => {
  if (!lookbook || lookbook.items.length === 0) return null;
  return (
    <section className="shell py-20 md:py-32" aria-labelledby="lookbook-heading">
      <Reveal className="mb-12 flex flex-col gap-6 md:mb-16 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow mb-4 text-stone">{[content.eyebrow || 'Lookbook', lookbook.season].filter(Boolean).join(' — ')}</p>
          <h2 id="lookbook-heading" className="display max-w-[14ch] text-5xl md:text-7xl">
            {content.heading || lookbook.title}
          </h2>
        </div>
        <Link to="/lookbook" className="eyebrow link-underlined shrink-0 self-start md:self-auto">
          {content.ctaLabel || 'View the lookbook'}
        </Link>
      </Reveal>

      <div className="grid grid-cols-12 gap-3 md:gap-6">
        {lookbook.items.slice(0, 3).map((item, index) => (
          <ImageReveal key={item.id} delay={index * 0.1} className={cx('relative overflow-hidden', TEASER_LAYOUT[index])}>
            <Link to="/lookbook" className="absolute inset-0" aria-label={item.caption || `Lookbook image ${index + 1}`}>
              <Media
                src={item.mediaUrl}
                type={item.mediaType}
                poster={item.posterUrl}
                alt=""
                tone={TEASER_TONES[index]}
                label={item.caption || 'Lookbook image'}
                sizes="(min-width: 768px) 40vw, 60vw"
              />
            </Link>
          </ImageReveal>
        ))}
      </div>
    </section>
  );
};
