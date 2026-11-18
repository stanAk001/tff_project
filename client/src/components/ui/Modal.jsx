import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLockScroll } from '../../hooks/useUi.js';
import { cx } from '../../utils/format.js';
import { CloseIcon } from './Icons.jsx';

const EASE = [0.16, 1, 0.3, 1];

const PANELS = {
  right: {
    className: 'right-0 top-0 h-dvh w-full sm:max-w-[30rem]',
    motion: { initial: { x: '100%' }, animate: { x: 0 }, exit: { x: '100%' } },
  },
  left: {
    className: 'left-0 top-0 h-dvh w-full sm:max-w-[26rem]',
    motion: { initial: { x: '-100%' }, animate: { x: 0 }, exit: { x: '-100%' } },
  },
  top: {
    className: 'inset-x-0 top-0 max-h-dvh w-full',
    motion: { initial: { y: '-100%' }, animate: { y: 0 }, exit: { y: '-100%' } },
  },
  bottom: {
    className: 'inset-x-0 bottom-0 max-h-[90dvh] w-full',
    motion: { initial: { y: '100%' }, animate: { y: 0 }, exit: { y: '100%' } },
  },
  full: {
    className: 'inset-0 h-dvh w-full',
    motion: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  },
  center: {
    className:
      'inset-x-0 bottom-0 max-h-[90dvh] w-full sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-xl sm:-translate-x-1/2 sm:-translate-y-1/2',
    motion: { initial: { opacity: 0, y: 24 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 } },
  },
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Accessible dialog used for every drawer and modal on the site:
// focus is trapped inside, Escape closes it, and focus returns to where it was.
const Modal = ({ open, onClose, side = 'center', title, hideTitle = false, children, className, wide = false }) => {
  const panelRef = useRef(null);
  const titleId = useId();
  useLockScroll(open);

  // Kept in a ref so a new onClose function on each render doesn't restart the focus handling
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;
    const panel = panelRef.current;
    const timer = setTimeout(() => {
      const target = panel?.querySelector('[data-autofocus]') || panel?.querySelector(FOCUSABLE);
      (target || panel)?.focus({ preventScroll: true });
    }, 60);

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [open]);

  const panel = PANELS[side];

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div
            className="absolute inset-0 bg-ink/45"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            tabIndex={-1}
            className={cx(
              'absolute flex flex-col outline-none',
              // A caller can give the panel its own colours (the dark image viewer does)
              !className?.includes('bg-') && 'bg-paper text-ink',
              panel.className,
              wide && side === 'center' && 'sm:max-w-3xl',
              className,
            )}
            {...panel.motion}
            transition={{ duration: 0.5, ease: EASE }}
          >
            <header
              className={cx(
                'flex shrink-0 items-center justify-between gap-6 px-5 md:px-8',
                hideTitle ? 'absolute right-0 top-0 z-10 h-16' : 'h-16 border-b border-mist',
              )}
            >
              <h2 id={titleId} className={cx('eyebrow', hideTitle && 'sr-only')}>
                {title}
              </h2>
              <button type="button" onClick={onClose} aria-label="Close" className="-mr-2 flex size-10 items-center justify-center">
                <CloseIcon />
              </button>
            </header>
            <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default Modal;
