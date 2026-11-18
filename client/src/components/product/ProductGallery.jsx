import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cx } from '../../utils/format.js';
import { resized } from '../../utils/media.js';
import { ArrowIcon } from '../ui/Icons.jsx';
import Media from '../ui/Media.jsx';
import Modal from '../ui/Modal.jsx';
import { ImageReveal } from '../ui/Reveal.jsx';

const PLACEHOLDER_ANGLES = ['Front', 'Back', 'Detail'];

// Builds the list of things to show: photos (of the chosen colour when photos
// are tagged by colour), then any videos. With no photos yet, three labelled
// placeholder frames stand in.
const useSlides = (product, colour) =>
  useMemo(() => {
    const tagged = product.images.filter((image) => image.colour?.toLowerCase() === colour?.toLowerCase());
    const images = tagged.length ? [...tagged, ...product.images.filter((image) => !image.colour)] : product.images;
    const slides = [
      ...images.map((image) => ({ key: image.id, type: 'IMAGE', src: image.url, alt: image.alt || product.name })),
      ...product.videos.map((video) => ({ key: video.id, type: 'VIDEO', src: video.url, poster: video.posterUrl, alt: `${product.name} film` })),
    ];
    if (slides.length) return slides;
    return PLACEHOLDER_ANGLES.map((angle) => ({ key: angle, type: 'IMAGE', src: null, alt: '', label: `${product.name} — ${angle}` }));
  }, [product, colour]);

// ── Fullscreen viewer ────────────────────────────────────────────────────
// Every angle at full size on black. Arrow keys or buttons to move between them;
// click a photo to zoom in, move the pointer to look around, click again to step back.

const Viewer = ({ slides, start, open, onClose, productName }) => {
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState(null);
  const images = slides.filter((slide) => slide.src);

  useEffect(() => {
    if (open) {
      setIndex(Math.max(0, images.findIndex((slide) => slide.key === slides[start]?.key)));
      setZoom(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, start]);

  const go = (delta) => {
    setZoom(null);
    setIndex((current) => (current + delta + images.length) % images.length);
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const current = images[index];
  if (!current) return null;

  const position = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    return { x: ((event.clientX - box.left) / box.width) * 100, y: ((event.clientY - box.top) / box.height) * 100 };
  };

  return (
    <Modal open={open} onClose={onClose} side="full" title={`${productName} — ${index + 1} of ${images.length}`} className="bg-ink text-paper">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={current.key}
            className={cx('relative h-full w-full', current.type === 'IMAGE' && (zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'))}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(event) => current.type === 'IMAGE' && setZoom(zoom ? null : position(event))}
            onMouseMove={(event) => zoom && setZoom(position(event))}
          >
            {current.type === 'VIDEO' ? (
              <Media src={current.src} type="VIDEO" poster={current.poster} autoPlayOnMobile className="object-contain" />
            ) : (
              <img
                src={resized(current.src, 2000)}
                alt={current.alt}
                className="absolute inset-0 size-full object-contain transition-transform duration-300 ease-out"
                style={zoom ? { transform: 'scale(2.4)', transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
                draggable={false}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center bg-paper/10 hover:bg-paper/20 md:left-6"
            >
              <ArrowIcon direction="left" />
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 flex size-12 -translate-y-1/2 items-center justify-center bg-paper/10 hover:bg-paper/20 md:right-6"
            >
              <ArrowIcon />
            </button>
          </>
        )}
      </div>
      <p className="eyebrow shrink-0 py-4 text-center text-[0.625rem] text-paper/60" aria-hidden="true">
        {String(index + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
        {current.type === 'IMAGE' && ' — click to zoom'}
      </p>
    </Modal>
  );
};

// ── Gallery ──────────────────────────────────────────────────────────────

const ProductGallery = ({ product, colour }) => {
  const slides = useSlides(product, colour);
  const tone = product.colours.find((option) => option.name === colour)?.hex;
  const [index, setIndex] = useState(0);
  const [viewing, setViewing] = useState(null); // slide index open in the viewer
  const trackRef = useRef(null);
  const hasPhotos = slides.some((slide) => slide.src);

  useEffect(() => {
    setIndex(0);
    trackRef.current?.scrollTo({ left: 0 });
  }, [colour, product.id]);

  const onScroll = (event) => {
    const track = event.currentTarget;
    setIndex(Math.round(track.scrollLeft / track.clientWidth));
  };

  const open = (slideIndex) => hasPhotos && slides[slideIndex].type === 'IMAGE' && setViewing(slideIndex);

  return (
    <div>
      {/* ── Phones: swipeable, edge to edge; tap to open full screen ─────── */}
      <div className="relative -mx-5 md:hidden">
        <div
          ref={trackRef}
          onScroll={onScroll}
          className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto"
          role="group"
          aria-roledescription="carousel"
          aria-label={`${product.name} images`}
        >
          {slides.map((slide, slideIndex) => (
            <div key={slide.key} className="relative aspect-[4/5] w-full shrink-0 snap-center" aria-label={`${slideIndex + 1} of ${slides.length}`}>
              <Media src={slide.src} type={slide.type} poster={slide.poster} alt={slide.alt} tone={tone} label={slide.label} sizes="100vw" priority={slideIndex === 0} />
              {slide.type === 'IMAGE' && slide.src && (
                <button type="button" onClick={() => open(slideIndex)} className="absolute inset-0" aria-label={`View image ${slideIndex + 1} full screen`} />
              )}
            </div>
          ))}
        </div>
        {slides.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center gap-1.5" aria-hidden="true">
            {slides.map((slide, slideIndex) => (
              <span key={slide.key} className={cx('h-0.5 w-6 transition-colors', slideIndex === index ? 'bg-ink' : 'bg-ink/20')} />
            ))}
          </div>
        )}
      </div>

      {/* ── Larger screens: the showroom — every angle large, in an editorial stack ── */}
      <ul className="hidden grid-cols-2 gap-2 md:grid" aria-label={`${product.name} images`}>
        {slides.map((slide, slideIndex) => (
          <li key={slide.key} className={cx(slides.length !== 2 && (slideIndex === 0 || (slides.length % 2 === 0 && slideIndex === slides.length - 1)) && 'col-span-2')}>
            <ImageReveal className={cx('relative overflow-hidden', slideIndex === 0 && slides.length !== 2 ? 'aspect-[4/5]' : 'aspect-[3/4]')} delay={slideIndex === 0 ? 0 : 0.05}>
              <Media
                src={slide.src}
                type={slide.type}
                poster={slide.poster}
                alt={slide.alt}
                tone={tone}
                label={slide.label}
                sizes={slideIndex === 0 ? '(min-width: 1024px) 55vw, 90vw' : '(min-width: 1024px) 28vw, 45vw'}
                priority={slideIndex === 0}
                className="transition-transform duration-[1200ms] ease-out-expo hover:scale-[1.02]"
              />
              {slide.type === 'IMAGE' && slide.src && (
                <button
                  type="button"
                  onClick={() => open(slideIndex)}
                  className="absolute inset-0 cursor-zoom-in"
                  aria-label={`View image ${slideIndex + 1} full screen`}
                />
              )}
            </ImageReveal>
          </li>
        ))}
      </ul>

      <Viewer slides={slides} start={viewing ?? 0} open={viewing != null} onClose={() => setViewing(null)} productName={product.name} />
    </div>
  );
};

export default ProductGallery;
