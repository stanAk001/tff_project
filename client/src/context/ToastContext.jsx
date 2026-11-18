import { AnimatePresence, motion } from 'motion/react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((toast) => toast.id !== id)), []);

  const show = useCallback(
    (message, { type = 'info', action } = {}) => {
      const id = nextId.current++;
      // Keep at most three on screen
      setToasts((list) => [...list.slice(-2), { id, message, type, action }]);
      setTimeout(() => dismiss(id), type === 'error' ? 6000 : 3800);
    },
    [dismiss],
  );

  const value = useMemo(
    () => ({
      toast: show,
      success: (message, options) => show(message, { ...options, type: 'success' }),
      error: (message, options) => show(message, { ...options, type: 'error' }),
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Pages with a fixed action bar set --toast-offset so messages never cover its buttons */}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-[var(--toast-offset,0px)] z-[90] flex flex-col items-center gap-2 p-4 md:items-end md:p-6"
        aria-live="polite"
        role="status"
      >
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className={`pointer-events-auto flex w-full max-w-sm items-center gap-4 px-5 py-4 text-sm shadow-[0_8px_30px_rgba(0,0,0,0.12)] ${
                toast.type === 'error' ? 'bg-danger text-white' : 'bg-ink text-paper'
              }`}
            >
              <p className="flex-1">{toast.message}</p>
              {toast.action && (
                <button
                  type="button"
                  className="eyebrow link-underlined shrink-0"
                  onClick={() => {
                    toast.action.onClick();
                    dismiss(toast.id);
                  }}
                >
                  {toast.action.label}
                </button>
              )}
              <button type="button" onClick={() => dismiss(toast.id)} aria-label="Dismiss" className="shrink-0 opacity-70 hover:opacity-100">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.2" aria-hidden="true">
                  <path d="M1 1l10 10M11 1L1 11" />
                </svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
