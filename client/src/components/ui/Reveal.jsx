import { motion, useReducedMotion } from 'motion/react';

const EASE = [0.16, 1, 0.3, 1];

// Fades and lifts content into place the first time it scrolls into view.
export const Reveal = ({ children, delay = 0, y = 28, className, as = 'div', once = true }) => {
  const reduced = useReducedMotion();
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial={reduced ? false : { opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '0px 0px -12% 0px' }}
      transition={{ duration: 0.9, delay, ease: EASE }}
    >
      {children}
    </Component>
  );
};

// Uncovers an image from the bottom up, with a slight settle — the editorial image reveal.
export const ImageReveal = ({ children, className, delay = 0 }) => {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { clipPath: 'inset(100% 0% 0% 0%)' }}
      whileInView={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 1.2, delay, ease: EASE }}
    >
      <motion.div
        className="size-full"
        initial={reduced ? false : { scale: 1.12 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true, margin: '0px 0px -10% 0px' }}
        transition={{ duration: 1.6, delay, ease: EASE }}
      >
        {children}
      </motion.div>
    </motion.div>
  );
};

// Reveals a heading line by line, each sliding up from behind a mask.
export const TextReveal = ({ text, className, delay = 0, as: Tag = 'h1', immediate = false }) => {
  const reduced = useReducedMotion();
  const lines = String(text || '').split('\n');
  const animate = { y: '0%' };
  return (
    <Tag className={className}>
      {lines.map((line, index) => (
        <span key={index} className="block overflow-hidden pb-[0.12em]">
          <motion.span
            className="block"
            initial={reduced ? false : { y: '110%' }}
            {...(immediate ? { animate } : { whileInView: animate, viewport: { once: true } })}
            transition={{ duration: 1.1, delay: delay + index * 0.09, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
};
