import { motion, useReducedMotion, useTransform } from 'motion/react';
import { useRef } from 'react';
import Button from '../ui/Button.jsx';
import Media from '../ui/Media.jsx';
import { useSectionScroll } from '../../hooks/useSectionScroll.js';
import { ImageReveal, Reveal } from '../ui/Reveal.jsx';

// The brand story, laid out like a magazine spread: one large photograph, one quiet column of type.
const Editorial = ({ content }) => {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const scrollYProgress = useSectionScroll(ref, ['start end', 'end start']);
  const drift = useTransform(scrollYProgress, [0, 1], reduced ? ['0%', '0%'] : ['-6%', '6%']);

  return (
    <section ref={ref} className="bg-bone">
      <div className="shell grid items-center gap-12 py-20 md:py-32 lg:grid-cols-12 lg:gap-10">
        <ImageReveal className="relative aspect-[4/5] overflow-hidden lg:col-span-7">
          <motion.div className="absolute inset-[-7%]" style={{ y: drift }}>
            <Media
              src={content.mediaUrl}
              type={content.mediaType}
              poster={content.posterUrl}
              alt=""
              tone="#8b867d"
              label="Editorial image or film"
              sizes="(min-width: 1024px) 58vw, 100vw"
            />
          </motion.div>
        </ImageReveal>

        <Reveal className="lg:col-span-4 lg:col-start-9" delay={0.15}>
          <p className="wordmark mb-8 text-5xl" aria-hidden="true">
            TFF
          </p>
          {content.eyebrow && <p className="eyebrow mb-6 text-stone">{content.eyebrow}</p>}
          <h2 className="display text-5xl italic md:text-6xl">“{(content.heading || 'More than what you wear.').replace(/^[“"]|[”"]$/g, '')}”</h2>
          {content.body && <p className="mt-8 text-base leading-relaxed text-graphite">{content.body}</p>}
          {content.ctaLabel && (
            <Button variant="outline" to={content.ctaHref || '/lookbook'} className="mt-10">
              {content.ctaLabel}
            </Button>
          )}
        </Reveal>
      </div>
    </section>
  );
};

export default Editorial;
