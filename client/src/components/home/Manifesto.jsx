import { motion, useMotionValueEvent, useReducedMotion, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { useMediaQuery } from '../../hooks/useUi.js';
import { cx } from '../../utils/format.js';
import { resized, videoSrc } from '../../utils/media.js';
import { useSectionScroll } from '../../hooks/useSectionScroll.js';
import { ArrowIcon } from '../ui/Icons.jsx';
import { Grain, LiveStock, Seam, ShopDropLink, Timecode, WholeRange } from './ManifestoProof.jsx';

const EASE = [0.16, 1, 0.3, 1];

// "Fewer pieces. Made properly. Released…" → one title card per sentence
const sentencesOf = (text) =>
  String(text || '')
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

// The word the film plays through: set by the owner, or the statement's first word
const keywordOf = (content) =>
  (content.keyword || String(content.heading || 'TFF').split(/\s+/)[0]).replace(/[^\p{L}\p{N}]/gu, '').toUpperCase();

// Phones get a lighter file: Mixkit's 360p encode, or a smaller Cloudinary rendition
const filmSource = (url, phone) => {
  if (/assets\.mixkit\.co\/.+-720\.mp4$/.test(url)) return phone ? url.replace(/-720\.mp4$/, '-360.mp4') : url;
  return videoSrc(url, phone ? 720 : 1600);
};

// ── The film ─────────────────────────────────────────────────────────────
// Loads only as the section approaches, plays only while it is on screen, and
// stays paused once the visitor pauses it. Phones get the lighter encode.

const useFilm = (sectionRef, src, enabled) => {
  const videoRef = useRef(null);
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [playing, setPlaying] = useState(false);
  const userPaused = useRef(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || !src || !enabled) return undefined;
    const approach = new IntersectionObserver(([entry]) => entry.isIntersecting && setNear(true), { rootMargin: '150% 0px' });
    const onScreen = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0 });
    approach.observe(section);
    onScreen.observe(section);
    return () => {
      approach.disconnect();
      onScreen.disconnect();
    };
  }, [sectionRef, src, enabled]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !near) return;
    if (visible && !userPaused.current) video.play().catch(() => {});
    else video.pause();
  }, [near, visible]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    userPaused.current = !video.paused;
    if (video.paused) video.play().catch(() => {});
    else video.pause();
  };

  return { videoRef, near, playing, setPlaying, toggle };
};

// ── One title card ───────────────────────────────────────────────────────

const TitleCard = ({ progress, range, holdAtEnd, index, children }) => {
  const [start, end] = range;
  const span = end - start;
  const fadeIn = [start, start + span * 0.22];
  const fadeOut = [end - span * 0.18, end];
  const opacity = useTransform(progress, holdAtEnd ? fadeIn : [...fadeIn, ...fadeOut], holdAtEnd ? [0, 1] : [0, 1, 1, 0]);
  const y = useTransform(progress, holdAtEnd ? fadeIn : [...fadeIn, ...fadeOut], holdAtEnd ? [40, 0] : [40, 0, 0, -40]);
  const blur = useTransform(progress, fadeIn, ['blur(14px)', 'blur(0px)']);
  // Each card keeps creeping forward slightly while it is on screen, like a slow dolly.
  // The closing line instead lifts and steps back as the sign-off arrives beneath it.
  const drift = useTransform(progress, [start, end], [0.97, 1.03]);
  const lift = useTransform(progress, [0.86, 0.95], ['0svh', '-13svh']);
  const settle = useTransform(progress, [start, 0.86, 0.95], [0.97, 1.0, 0.82]);
  const scale = holdAtEnd ? settle : drift;

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center px-5" style={holdAtEnd ? { y: lift } : undefined} aria-hidden="true">
      <motion.p
        className="display max-w-[18ch] text-center text-[clamp(2.4rem,6.4vw,6.75rem)] leading-[1.02] text-paper"
        style={{ opacity, y, filter: blur, scale }}
      >
        <span className="eyebrow mb-6 block text-[0.625rem] text-paper/60 md:mb-8">{String(index + 1).padStart(2, '0')}</span>
        {children}
      </motion.p>
    </motion.div>
  );
};

// ── The section ──────────────────────────────────────────────────────────

const Manifesto = ({ content, proof }) => {
  const sectionRef = useRef(null);
  const reduced = useReducedMotion();
  const phone = useMediaQuery('(max-width: 767px)');
  const sentences = sentencesOf(content.heading);
  const keyword = keywordOf(content);
  const film = content.mediaType === 'VIDEO' ? content.mediaUrl : null;
  const still = content.mediaType === 'VIDEO' ? content.posterUrl : content.mediaUrl;
  const { videoRef, near, playing, setPlaying, toggle } = useFilm(sectionRef, film, !reduced);

  const progress = useSectionScroll(sectionRef, ['start start', 'end end']);

  // Act one — the film plays inside the word, then the camera pushes through it
  const wordScale = useTransform(progress, [0.04, 0.3], [1, 11]);
  const maskOpacity = useTransform(progress, [0.2, 0.3], [1, 0]);
  const introOpacity = useTransform(progress, [0, 0.08], [1, 0]);
  // The footage settles as it takes over the frame, then dims under the title cards
  const filmScale = useTransform(progress, [0, 0.35, 1], [1.25, 1.05, 1]);
  const veil = useTransform(progress, [0.28, 0.38], [0, 0.5]);
  // Act three — the sign-off
  const outroOpacity = useTransform(progress, [0.9, 0.97], [0, 1]);
  const outroY = useTransform(progress, [0.9, 0.97], [24, 0]);
  const rule = useTransform(progress, [0.34, 0.97], [0, 1]);
  // Cinema framing once the film has the screen: letterbox bars, grain, timecode
  const bar = useTransform(progress, [0.28, 0.38], ['0svh', '8svh']);
  const grain = useTransform(progress, [0.26, 0.36], [0, 0.14]);
  const frameInfo = useTransform(progress, [0.34, 0.4], [0, 1]);
  const [chapter, setChapter] = useState(0);
  // Live evidence behind the words (the owner can switch this off)
  const showProof = content.showProof !== false && proof;

  const cardsFrom = 0.34;
  const cardsTo = 0.9;
  const step = (cardsTo - cardsFrom) / Math.max(1, sentences.length);
  useMotionValueEvent(progress, 'change', (value) => {
    setChapter(value < cardsFrom ? 0 : Math.min(sentences.length, Math.floor((value - cardsFrom) / step) + 1));
  });

  if (!sentences.length) return null;

  const cta = content.ctaLabel && (
    <Link
      to={content.ctaHref || '/lookbook'}
      className="group eyebrow pointer-events-auto inline-flex h-13 items-center gap-4 border border-paper/60 px-7 text-paper transition-colors hover:bg-paper hover:text-ink"
    >
      {content.ctaLabel}
      <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
        <ArrowIcon size={14} />
      </span>
    </Link>
  );

  // Reduced motion: one composed frame — still image, the full statement, the link
  if (reduced) {
    return (
      <section className="relative overflow-hidden bg-ink text-paper" aria-label={content.eyebrow || 'About TFF'}>
        {still && <img src={resized(still, 1600)} alt="" className="absolute inset-0 size-full object-cover opacity-40" loading="lazy" />}
        <div className="shell relative py-28 md:py-40">
          <p className="eyebrow mb-8 text-paper/60">{content.eyebrow}</p>
          <p className="display max-w-[20ch] text-[clamp(2.25rem,5vw,5rem)] leading-[1.05]">{content.heading}</p>
          <div className="mt-12 flex flex-wrap items-center justify-between gap-6">
            {content.body && <p className="eyebrow text-paper/60">{content.body}</p>}
            {cta}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={sectionRef} className="relative h-[460svh] bg-ink" aria-label={content.eyebrow || 'About TFF'}>
      {/* The whole statement for screen readers; the visual version is choreographed below */}
      <p className="sr-only">{content.heading}</p>

      <div className="sticky top-0 isolate h-svh overflow-hidden text-paper">
        {/* The film (or a still, if no film has been uploaded) */}
        <motion.div className="absolute inset-0" style={{ scale: filmScale }}>
          {film ? (
            <video
              ref={videoRef}
              className="absolute inset-0 size-full object-cover"
              src={near ? filmSource(film, phone) : undefined}
              poster={still ? resized(still, phone ? 800 : 1600) : undefined}
              muted
              loop
              playsInline
              preload="none"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
          ) : (
            still && <img src={resized(still, 1920)} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
          )}
        </motion.div>
        <motion.div className="absolute inset-0 bg-ink" style={{ opacity: veil }} aria-hidden="true" />
        <Grain opacity={grain} />

        {/* Letterbox bars close in as the film takes the screen, carrying a caption and the footage's timecode */}
        <motion.div className="absolute inset-x-0 top-0 z-10 overflow-hidden bg-ink" style={{ height: bar }} aria-hidden="true">
          <motion.div className="shell flex h-full items-end justify-between pb-3 text-paper/55" style={{ opacity: frameInfo }}>
            <span className="eyebrow text-[0.5625rem]">{content.body || content.eyebrow || 'TFF'}</span>
            {film && (
              <span className="eyebrow text-[0.5625rem]">
                TFF — <Timecode videoRef={videoRef} />
              </span>
            )}
          </motion.div>
        </motion.div>
        <motion.div className="absolute inset-x-0 bottom-0 z-10 bg-ink" style={{ height: bar }} aria-hidden="true" />

        {/* Act one: a black frame with the film showing only through the letters.
            Multiply keeps the black and lets the footage through the white type. */}
        <motion.div className="absolute inset-0 flex items-center justify-center bg-ink mix-blend-multiply" style={{ opacity: maskOpacity }} aria-hidden="true">
          <motion.span
            className="wordmark block whitespace-nowrap text-white"
            style={{ scale: wordScale, fontWeight: 800, fontSize: 'clamp(6rem, min(24vw, 52svh), 30rem)', letterSpacing: '-0.04em' }}
          >
            {keyword}
          </motion.span>
        </motion.div>

        {/* A hairline outline of the same word, so it reads in full even where the footage is dark */}
        <motion.div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ opacity: maskOpacity }} aria-hidden="true">
          <motion.span
            className="wordmark block whitespace-nowrap text-transparent"
            style={{
              scale: wordScale,
              fontWeight: 800,
              fontSize: 'clamp(6rem, min(24vw, 52svh), 30rem)',
              letterSpacing: '-0.04em',
              WebkitTextStroke: '1px rgba(245, 242, 237, 0.35)',
            }}
          >
            {keyword}
          </motion.span>
        </motion.div>

        {/* Opening caption, gone as soon as the push-in starts */}
        <motion.div className="shell absolute inset-x-0 top-0 flex items-center gap-4 pt-28 md:pt-32" style={{ opacity: introOpacity }} aria-hidden="true">
          <span className="wordmark text-2xl">TFF</span>
          <span className="h-px w-12 bg-paper/40" />
          {content.eyebrow && <span className="eyebrow text-paper/70">{content.eyebrow}</span>}
        </motion.div>
        <motion.p className="eyebrow absolute inset-x-0 bottom-10 text-center text-[0.625rem] text-paper/60" style={{ opacity: introOpacity }} aria-hidden="true">
          Keep scrolling
        </motion.p>

        {/* Act two: the statement as title cards, one sentence at a time */}
        <div className="absolute inset-0">
          {sentences.map((sentence, index) => (
            <TitleCard
              key={index}
              index={index}
              progress={progress}
              range={[cardsFrom + step * index, cardsFrom + step * (index + 1)]}
              holdAtEnd={index === sentences.length - 1}
            >
              {sentence}
            </TitleCard>
          ))}
        </div>

        {/* The thread that sews the statement together, and the evidence under the first line */}
        {showProof && <Seam progress={progress} range={[cardsFrom, cardsTo]} />}
        {showProof && proof.pieces.length > 0 && (
          <WholeRange pieces={proof.pieces} progress={progress} range={[cardsFrom, cardsFrom + step]} phone={phone} />
        )}

        {/* Act three: the sign-off — live stock from the current drop, then the way in */}
        <motion.div
          className="pointer-events-none absolute inset-x-0 bottom-[11svh] z-20 flex flex-col items-center gap-6 px-5"
          style={{ opacity: outroOpacity, y: outroY }}
        >
          {showProof && proof.drop?.left > 0 && <LiveStock drop={proof.drop} progress={progress} from={0.9} />}
          <div className="flex flex-wrap items-center justify-center gap-3">
            {showProof && proof.drop?.left > 0 && <ShopDropLink drop={proof.drop} />}
            {cta}
          </div>
        </motion.div>

        {/* Chapter counter, progress rule and film control */}
        <div className="shell absolute inset-x-0 bottom-0 z-20 flex items-center gap-5 pb-7 text-paper/70">
          <span className={cx('eyebrow w-14 text-[0.625rem] tabular-nums transition-opacity', chapter === 0 && 'opacity-0')} aria-hidden="true">
            {String(Math.max(chapter, 1)).padStart(2, '0')} / {String(sentences.length).padStart(2, '0')}
          </span>
          <div className="h-px flex-1 bg-paper/20" aria-hidden="true">
            <motion.div className="h-px origin-left bg-paper" style={{ scaleX: rule }} />
          </div>
          {film && (
            <button type="button" onClick={toggle} className="eyebrow flex items-center gap-2.5 text-[0.625rem] hover:text-paper" aria-label={playing ? 'Pause film' : 'Play film'}>
              <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden="true">
                {playing ? <path d="M0 0h3v10H0zM6 0h3v10H6z" /> : <path d="M0 0l9 5-9 5z" />}
              </svg>
              {playing ? 'Pause' : 'Play'}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Manifesto;
