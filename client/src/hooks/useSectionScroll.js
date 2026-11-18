import { useScroll, useTransform } from 'motion/react';

// Scroll progress (0 → 1) through one section.
//
// Motion can hand simple scroll-linked animations (like opacity) to the browser's
// native scroll timeline. For sticky, pinned sections that timeline can end up
// measured against the whole page instead of the section, so fades stop short.
// Passing the value through a function keeps every animation calculated against
// the section itself.
export const useSectionScroll = (ref, offset = ['start start', 'end end']) => {
  const { scrollYProgress } = useScroll({ target: ref, offset });
  return useTransform(scrollYProgress, (value) => value);
};
