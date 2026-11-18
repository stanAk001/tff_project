import { useId } from 'react';
import { cx } from '../../utils/format.js';
import { ChevronIcon } from './Icons.jsx';

const control =
  'block w-full border-0 border-b bg-transparent px-0 py-3 text-ink placeholder:text-stone focus:outline-none focus:ring-0 transition-colors';

const Wrapper = ({ id, label, error, hint, children, className }) => (
  <div className={className}>
    <label htmlFor={id} className="eyebrow block text-graphite">
      {label}
    </label>
    {children}
    {error ? (
      <p id={`${id}-error`} role="alert" className="mt-2 text-[0.8125rem] text-danger">
        {error}
      </p>
    ) : (
      hint && <p className="mt-2 text-[0.8125rem] text-stone">{hint}</p>
    )}
  </div>
);

const borderFor = (error) => (error ? 'border-danger' : 'border-mist focus:border-ink');

// Labelled text input with inline error support.
export const Input = ({ label, error, hint, className, id: givenId, ...rest }) => {
  const generated = useId();
  const id = givenId || generated;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className}>
      <input
        id={id}
        className={cx(control, borderFor(error))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
    </Wrapper>
  );
};

export const Textarea = ({ label, error, hint, className, rows = 4, id: givenId, ...rest }) => {
  const generated = useId();
  const id = givenId || generated;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className}>
      <textarea
        id={id}
        rows={rows}
        className={cx(control, 'resize-y', borderFor(error))}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        {...rest}
      />
    </Wrapper>
  );
};

export const Select = ({ label, error, hint, className, children, id: givenId, ...rest }) => {
  const generated = useId();
  const id = givenId || generated;
  return (
    <Wrapper id={id} label={label} error={error} hint={hint} className={className}>
      <div className="relative">
        <select
          id={id}
          className={cx(control, 'appearance-none pr-8', borderFor(error))}
          aria-invalid={error ? true : undefined}
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2">
          <ChevronIcon />
        </span>
      </div>
    </Wrapper>
  );
};

// Square checkbox used in filters and forms.
export const Checkbox = ({ label, checked, onChange, className, ...rest }) => (
  <label className={cx('group flex cursor-pointer items-center gap-3 py-1.5 text-sm', className)}>
    <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} {...rest} />
    <span
      className={cx(
        'flex size-4 shrink-0 items-center justify-center border transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
        checked ? 'border-ink bg-ink text-paper' : 'border-stone group-hover:border-ink',
      )}
      aria-hidden="true"
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 7.5l3.5 3.5L12 3.5" />
        </svg>
      )}
    </span>
    <span>{label}</span>
  </label>
);
