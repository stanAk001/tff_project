import { useEffect, useRef, useState } from 'react';
import { useMediaQuery } from '../../hooks/useUi.js';
import { cx, isLightColour } from '../../utils/format.js';
import { resized, srcSet, videoSrc } from '../../utils/media.js';

// Shown wherever real photography hasn't been uploaded yet. It is deliberately
// labelled so nobody mistakes it for finished content.
export const Placeholder = ({ label = 'Image', tone = '#e9e5dd', className, compact = false, quiet = false, labelTop = false }) => {
  const light = isLightColour(tone);
  return (
    <div
      className={cx('absolute inset-0 flex items-center justify-center overflow-hidden', className)}
      style={{ containerType: 'inline-size', backgroundColor: tone, color: light ? 'rgba(12,12,12,0.55)' : 'rgba(245,242,237,0.6)' }}
      role="img"
      aria-label={`Placeholder — ${label}`}
    >
      {!quiet && (
      <span
        className="wordmark select-none"
        style={{ fontSize: compact ? '2.25rem' : 'clamp(2.5rem, 9cqw, 9rem)', opacity: 0.22 }}
        aria-hidden="true"
      >
        TFF
      </span>
      )}
      {!compact && (
        <span className={cx('eyebrow absolute left-4 right-4 text-[0.5625rem] md:left-5', labelTop ? 'top-4 md:top-5' : 'bottom-4 md:bottom-5')} aria-hidden="true">
          {label} — placeholder
        </span>
      )}
    </div>
  );
};

const Video = ({ src, poster, className, autoPlayOnMobile, toggleClassName }) => {
  const ref = useRef(null);
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const mobile = useMediaQuery('(max-width: 767px)');
  // Large videos don't autoplay on phones (data, battery) or when motion is reduced
  const canAutoplay = !reducedMotion && (!mobile || autoPlayOnMobile);
  const [playing, setPlaying] = useState(false);
  // Once a visitor pauses, scrolling back into view doesn't restart the film
  const userPaused = useRef(false);

  // Only play while on screen
  useEffect(() => {
    const video = ref.current;
    if (!video || !canAutoplay) return undefined;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) video.play().catch(() => {});
        else video.pause();
      },
      { threshold: 0.25 },
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [canAutoplay, src]);

  const toggle = () => {
    const video = ref.current;
    if (!video) return;
    if (video.paused) {
      userPaused.current = false;
      video.play().catch(() => {});
    } else {
      userPaused.current = true;
      video.pause();
    }
  };

  return (
    <>
      <video
        ref={ref}
        className={cx('absolute inset-0 size-full object-cover', className)}
        src={videoSrc(src, mobile ? 900 : 1600)}
        poster={poster ? resized(poster, mobile ? 800 : 1600) : undefined}
        muted
        loop
        playsInline
        preload={canAutoplay ? 'metadata' : 'none'}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      {/* Moving footage can always be stopped */}
      <button
        type="button"
        onClick={toggle}
        className={cx(
          'eyebrow absolute z-10 flex items-center gap-2.5 text-[0.625rem]',
          canAutoplay && playing ? 'bg-ink/35 px-3 py-2.5 text-paper backdrop-blur-sm hover:bg-ink/55' : 'bg-paper/90 px-4 py-3 text-ink',
          toggleClassName || 'bottom-4 right-4',
        )}
        aria-label={playing ? 'Pause film' : 'Play film'}
      >
        <svg width="9" height="10" viewBox="0 0 9 10" fill="currentColor" aria-hidden="true">
          {playing ? <path d="M0 0h3v10H0zM6 0h3v10H6z" /> : <path d="M0 0l9 5-9 5z" />}
        </svg>
        {playing ? 'Pause' : 'Play film'}
      </button>
    </>
  );
};

// The single way images and videos are shown on the site. Fills its parent,
// which should set the size (usually an aspect-ratio box with `relative`).
const Media = ({
  src,
  type = 'IMAGE',
  poster,
  alt = '',
  sizes = '100vw',
  priority = false,
  label = 'Image',
  tone,
  className,
  compactPlaceholder = false,
  quietPlaceholder = false,
  placeholderLabelTop = false,
  autoPlayOnMobile = false,
  maxWidth = 2400,
  toggleClassName,
}) => {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const imgRef = useRef(null);

  // Cached images can finish loading before React attaches onLoad
  useEffect(() => {
    setFailed(false);
    setLoaded(Boolean(imgRef.current?.complete && imgRef.current.naturalWidth));
  }, [src]);

  if (!src || failed) {
    return <Placeholder label={failed ? 'Image unavailable' : label} tone={tone} compact={compactPlaceholder} quiet={quietPlaceholder} labelTop={placeholderLabelTop} />;
  }

  if (type === 'VIDEO') {
    return <Video src={src} poster={poster} className={className} autoPlayOnMobile={autoPlayOnMobile} toggleClassName={toggleClassName} />;
  }

  return (
    <>
      <div className="absolute inset-0 bg-bone" aria-hidden="true" />
      <img
        ref={imgRef}
        src={resized(src, Math.min(1080, maxWidth))}
        srcSet={srcSet(src, maxWidth)}
        sizes={sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        fetchPriority={priority ? 'high' : undefined}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={cx(
          'absolute inset-0 size-full object-cover transition-opacity duration-700',
          loaded ? 'opacity-100' : 'opacity-0',
          className,
        )}
      />
    </>
  );
};

export default Media;
