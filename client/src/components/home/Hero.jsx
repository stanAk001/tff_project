import { motion, useReducedMotion, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Link } from 'react-router';
import { ArrowIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';
import { useSectionScroll } from '../../hooks/useSectionScroll.js';
import { TextReveal } from '../ui/Reveal.jsx';

const EASE = [0.16, 1, 0.3, 1];

// ── The headline ─────────────────────────────────────────────────────────
// The line acts out what it says. "Made to" sits small and italic; the last two
// words are set huge and *stand apart*: they rise side by side in the centre, then
// pull away to opposite edges as a hairline draws out between them — and keep
// drifting further apart as the visitor scrolls on.

const splitHeading = (heading) => {
  const words = heading.trim().split(/\s+/);
  if (words.length < 2) return { lead: '', left: words[0] || '', right: '' };
  return { lead: words.slice(0, -2).join(' '), left: words.at(-2), right: words.at(-1) };
};

// One of the two big words: scroll drift (outer) → entrance separation → rising mask
const BigWord = ({ children, drift, from, reduced, delay, align }) => (
  <motion.span className={`block ${align}`} style={{ x: drift }}>
    <motion.span
      className="block"
      initial={reduced ? false : { x: from }}
      animate={{ x: '0vw' }}
      transition={{ duration: 1.5, delay: delay + 0.55, ease: [0.76, 0, 0.24, 1] }}
    >
      <span className="block overflow-hidden pb-[0.06em]">
        <motion.span
          className="block"
          initial={reduced ? false : { y: '108%' }}
          animate={{ y: '0%' }}
          transition={{ duration: 1.1, delay, ease: EASE }}
        >
          {children}
        </motion.span>
      </span>
    </motion.span>
  </motion.span>
);

const Headline = ({ heading, progress, reduced }) => {
  const { lead, left, right } = splitHeading(heading);
  const leftDrift = useTransform(progress, [0, 0.6], ['0vw', reduced ? '0vw' : '-5vw']);
  const rightDrift = useTransform(progress, [0, 0.6], ['0vw', reduced ? '0vw' : '5vw']);
  // Big enough to command the frame, small enough that the gap between the words reads
  const big = 'display uppercase leading-[0.84] tracking-[-0.035em] text-[clamp(3.6rem,13.2vw,15rem)] md:text-[clamp(4rem,9.6vw,12.5rem)]';

  return (
    <h1 aria-label={`TFF — ${heading}`}>
      {lead && (
        <TextReveal
          as="span"
          immediate
          delay={0.55}
          text={lead}
          className="display mb-2 block text-[clamp(1.75rem,3.4vw,3.75rem)] italic leading-none md:mb-0 md:pl-[0.6vw]"
        />
      )}
      <span className="flex flex-col md:flex-row md:items-end" aria-hidden="true">
        {/* On phones the pair steps diagonally down the screen; on larger screens they hold opposite edges */}
        <BigWord drift={leftDrift} from="14vw" reduced={reduced} delay={0.75} align={big}>
          {left}
        </BigWord>
        {right && (
          <>
            <motion.span
              className="mx-[2.2vw] mb-[3.2vw] hidden h-px flex-1 origin-center bg-paper/55 md:block"
              initial={reduced ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.2, delay: 1.75, ease: EASE }}
            />
            <BigWord drift={rightDrift} from="-14vw" reduced={reduced} delay={0.85} align={`${big} self-end md:self-auto`}>
              {right}
            </BigWord>
          </>
        )}
      </span>
    </h1>
  );
};

// ── Framing details ──────────────────────────────────────────────────────

// Camera viewfinder corners around the frame — the film is a photo shoot, and the
// page frames it the way the photographer would.
const Viewfinder = ({ reduced }) => {
  const corner = 'absolute size-5 border-paper/55 md:size-7';
  const spots = [
    'left-3 top-[calc(var(--header-h,6rem)+0.75rem)] border-l border-t md:left-5',
    'right-3 top-[calc(var(--header-h,6rem)+0.75rem)] border-r border-t md:right-5',
    'bottom-3 left-3 border-b border-l md:bottom-5 md:left-5',
    'bottom-3 right-3 border-b border-r md:bottom-5 md:right-5',
  ];
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      {spots.map((spot, index) => (
        <motion.span
          key={spot}
          className={`${corner} ${spot}`}
          initial={reduced ? false : { opacity: 0, scale: 1.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 1.5 + index * 0.06, ease: EASE }}
        />
      ))}
    </div>
  );
};

const ROMAN = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
  [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];
const roman = (year) => ROMAN.reduce((out, [value, numeral]) => {
  while (year >= value) {
    out += numeral;
    year -= value;
  }
  return out;
}, '');

// The brand on the edge of the frame, running vertically like a magazine spine
const EdgeLabel = ({ reduced }) => (
  <motion.p
    className="eyebrow pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 text-[0.5625rem] text-paper/60 [writing-mode:vertical-rl] md:block xl:right-6"
    initial={reduced ? false : { opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 1.2, delay: 2.2 }}
    aria-hidden="true"
  >
    TFF — {roman(new Date().getFullYear())}
  </motion.p>
);

// The opening scene. The film opens out of a letterbox frame, the wordmark rises
// letter by letter, then the line and the call to action settle in. As the visitor
// scrolls, the footage pushes in and the type steps back, handing over to the next
// section. Media, copy and both links come from Admin → Homepage.
const Hero = ({ content }) => {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const scrollYProgress = useSectionScroll(ref, ['start start', 'end start']);
  const push = useTransform(scrollYProgress, [0, 1], [1, reduced ? 1 : 1.12]);
  const drift = useTransform(scrollYProgress, [0, 1], ['0%', reduced ? '0%' : '10%']);
  const veil = useTransform(scrollYProgress, [0, 0.8], [0.28, reduced ? 0.28 : 0.7]);
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, reduced ? 1 : 0]);
  const lift = useTransform(scrollYProgress, [0, 0.55], ['0%', reduced ? '0%' : '-12%']);

  const heading = content.heading || 'Made to stand apart.';

  return (
    <section ref={ref} className="relative h-svh min-h-[40rem] overflow-hidden bg-ink text-paper" aria-label="TFF campaign">
      <motion.div
        className="absolute inset-0"
        initial={reduced ? false : { clipPath: 'inset(16% 9% 16% 9%)' }}
        animate={{ clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 1.7, ease: EASE, delay: 0.1 }}
      >
        <motion.div className="absolute inset-0" style={{ scale: push, y: drift }}>
          <motion.div
            className="absolute inset-0"
            initial={reduced ? false : { scale: 1.25 }}
            animate={{ scale: 1 }}
            transition={{ duration: 2.6, ease: EASE }}
          >
            <Media
              src={content.mediaUrl}
              type={content.mediaType}
              poster={content.posterUrl}
              alt=""
              priority
              sizes="100vw"
              tone="#1b1a18"
              label="Hero campaign image or film"
              quietPlaceholder
              autoPlayOnMobile
              toggleClassName="bottom-6 right-5 md:bottom-8 md:right-10 xl:right-14"
            />
          </motion.div>
        </motion.div>
        {/* A flat veil keeps the type legible over any footage, deepening as you scroll on */}
        <motion.div className="absolute inset-0 bg-ink" style={{ opacity: veil }} aria-hidden="true" />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink/60 to-transparent" aria-hidden="true" />
      </motion.div>

      <Viewfinder reduced={reduced} />
      <EdgeLabel reduced={reduced} />

      <motion.div className="shell relative flex h-full flex-col justify-end pb-24 md:pb-24" style={{ opacity: fade, y: lift }}>
        {content.eyebrow && (
          <motion.p
            className="eyebrow mb-6 flex items-center gap-4 md:mb-8"
            initial={reduced ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.9, ease: EASE }}
          >
            <span className="h-px w-10 bg-paper/60" aria-hidden="true" />
            {content.eyebrow}
          </motion.p>
        )}

        <Headline heading={heading} progress={scrollYProgress} reduced={reduced} />

        <motion.div
          className="mt-8 flex flex-col gap-6 border-t border-paper/25 pt-6 md:mt-10 md:flex-row md:items-center md:justify-between"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2.1 }}
        >
          {content.subheading && <p className="max-w-md text-[0.9375rem] text-paper/80">{content.subheading}</p>}
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 md:mr-28">
            {content.ctaLabel && (
              <Link
                to={content.ctaHref || '/shop'}
                className="group eyebrow inline-flex h-13 items-center gap-4 bg-paper px-7 text-ink transition-colors hover:bg-white"
              >
                {content.ctaLabel}
                <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
                  <ArrowIcon size={14} />
                </span>
              </Link>
            )}
            {content.cta2Label && (
              <Link to={content.cta2Href || '/lookbook'} className="eyebrow link-underlined">
                {content.cta2Label}
              </Link>
            )}
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;
