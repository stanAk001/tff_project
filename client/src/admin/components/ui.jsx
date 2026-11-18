import { createContext, useCallback, useContext, useId, useRef, useState } from 'react';
import Button from '../../components/ui/Button.jsx';
import { SearchIcon } from '../../components/ui/Icons.jsx';
import Modal from '../../components/ui/Modal.jsx';
import { cx, titleCase } from '../../utils/format.js';

// Building blocks shared by every admin screen. The admin uses the same type
// and palette as the storefront, with denser, boxed controls suited to data entry.

// ── Page frame ───────────────────────────────────────────────────────────

export const PageHeader = ({ title, description, children, back }) => (
  <header className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
    <div className="min-w-0">
      {back}
      <h1 className="display text-4xl md:text-5xl">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-graphite">{description}</p>}
    </div>
    {children && <div className="flex flex-wrap items-center gap-3">{children}</div>}
  </header>
);

export const Panel = ({ title, description, children, className, action }) => (
  <section className={cx('border border-mist bg-white', className)}>
    {(title || action) && (
      <div className="flex items-start justify-between gap-4 border-b border-mist px-5 py-4 md:px-6">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          {description && <p className="mt-1 text-[0.8125rem] text-graphite">{description}</p>}
        </div>
        {action}
      </div>
    )}
    <div className="p-5 md:p-6">{children}</div>
  </section>
);

// ── Form controls ────────────────────────────────────────────────────────

const box =
  'block w-full border bg-white px-3 py-2.5 text-ink placeholder:text-stone focus:outline-none focus:border-ink disabled:bg-bone disabled:text-graphite';

export const Field = ({ label, hint, error, children, className, htmlFor, optional }) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className="mb-1.5 block text-[0.8125rem] font-medium">
        {label}
        {optional && <span className="ml-1.5 font-normal text-stone">Optional</span>}
      </label>
    )}
    {children}
    {error ? (
      <p role="alert" className="mt-1.5 text-[0.8125rem] text-danger">
        {error}
      </p>
    ) : (
      hint && <p className="mt-1.5 text-[0.8125rem] text-graphite">{hint}</p>
    )}
  </div>
);

export const TextInput = ({ label, hint, error, className, optional, prefix, ...rest }) => {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id} optional={optional}>
      <div className="relative">
        {prefix && <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite">{prefix}</span>}
        <input id={id} className={cx(box, error ? 'border-danger' : 'border-mist', prefix && 'pl-8')} aria-invalid={error ? true : undefined} {...rest} />
      </div>
    </Field>
  );
};

export const TextArea = ({ label, hint, error, className, optional, rows = 4, ...rest }) => {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id} optional={optional}>
      <textarea id={id} rows={rows} className={cx(box, 'resize-y', error ? 'border-danger' : 'border-mist')} {...rest} />
    </Field>
  );
};

export const SelectInput = ({ label, hint, error, className, optional, children, ...rest }) => {
  const id = useId();
  return (
    <Field label={label} hint={hint} error={error} className={className} htmlFor={id} optional={optional}>
      <select id={id} className={cx(box, error ? 'border-danger' : 'border-mist')} {...rest}>
        {children}
      </select>
    </Field>
  );
};

export const Toggle = ({ label, description, checked, onChange, disabled }) => (
  <label className={cx('flex cursor-pointer items-start gap-3', disabled && 'cursor-not-allowed opacity-50')}>
    <input type="checkbox" role="switch" className="peer sr-only" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} />
    <span
      className={cx(
        'relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
        checked ? 'bg-ink' : 'bg-mist',
      )}
      aria-hidden="true"
    >
      <span className={cx('absolute left-0.5 top-0.5 size-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
    </span>
    <span>
      <span className="block text-sm font-medium">{label}</span>
      {description && <span className="block text-[0.8125rem] text-graphite">{description}</span>}
    </span>
  </label>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search' }) => (
  <label className="relative block w-full sm:w-72">
    <span className="sr-only">{placeholder}</span>
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-graphite">
      <SearchIcon size={14} />
    </span>
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className={cx(box, 'border-mist pl-9')}
    />
  </label>
);

export const Tabs = ({ tabs, value, onChange }) => (
  <div className="no-scrollbar flex gap-6 overflow-x-auto border-b border-mist" role="tablist">
    {tabs.map((tab) => (
      <button
        key={tab.value}
        type="button"
        role="tab"
        aria-selected={tab.value === value}
        onClick={() => onChange(tab.value)}
        className={cx(
          '-mb-px flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm transition-colors',
          tab.value === value ? 'border-ink font-medium' : 'border-transparent text-graphite hover:text-ink',
        )}
      >
        {tab.label}
        {tab.count != null && <span className="text-[0.75rem] tabular-nums text-stone">{tab.count}</span>}
      </button>
    ))}
  </div>
);

// ── Status ───────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  // text colour + dot colour; always shown with a word, never colour alone
  PUBLISHED: 'text-success',
  ACTIVE: 'text-success',
  APPROVED: 'text-success',
  PAID: 'text-success',
  DELIVERED: 'text-success',
  SUCCESS: 'text-success',
  PROCESSING: 'text-ink',
  SHIPPED: 'text-ink',
  UPCOMING: 'text-ink',
  DRAFT: 'text-graphite',
  PENDING: 'text-graphite',
  ARCHIVED: 'text-stone',
  CANCELLED: 'text-danger',
  REJECTED: 'text-danger',
  FAILED: 'text-danger',
};

export const StatusBadge = ({ status, label }) => (
  <span className={cx('inline-flex items-center gap-2 whitespace-nowrap text-[0.8125rem] font-medium', STATUS_STYLE[status] || 'text-graphite')}>
    <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
    {label || titleCase(status)}
  </span>
);

// ── Tables ───────────────────────────────────────────────────────────────

// columns: [{ key, header, render(row), align?, className? }]
export const AdminTable = ({ columns, rows, loading, empty, rowKey = (row) => row.id, onRowClick, caption }) => (
  <div className="overflow-x-auto border border-mist bg-white">
    <table className="w-full min-w-[40rem] text-left text-sm">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead>
        <tr className="border-b border-mist">
          {columns.map((column) => (
            <th
              key={column.key}
              scope="col"
              className={cx('whitespace-nowrap px-4 py-3 text-[0.75rem] font-medium text-graphite', column.align === 'right' && 'text-right')}
            >
              {column.header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {loading &&
          Array.from({ length: 6 }, (_, index) => (
            <tr key={index} className="border-b border-mist last:border-0" aria-hidden="true">
              {columns.map((column) => (
                <td key={column.key} className="px-4 py-4">
                  <div className="skeleton h-4 w-full max-w-32" />
                </td>
              ))}
            </tr>
          ))}
        {!loading &&
          rows.map((row) => (
            <tr
              key={rowKey(row)}
              className={cx('border-b border-mist last:border-0', onRowClick && 'cursor-pointer hover:bg-paper')}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {columns.map((column) => (
                <td key={column.key} className={cx('px-4 py-3.5 align-middle', column.align === 'right' && 'text-right tabular-nums', column.className)}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
      </tbody>
    </table>
    {!loading && rows.length === 0 && <div className="px-6 py-14 text-center">{empty}</div>}
    {loading && <span className="sr-only" role="status">Loading</span>}
  </div>
);

export const EmptyState = ({ title, body, children }) => (
  <div className="mx-auto max-w-sm">
    <p className="display text-2xl">{title}</p>
    {body && <p className="mt-2 text-sm text-graphite">{body}</p>}
    {children && <div className="mt-5 flex justify-center gap-3">{children}</div>}
  </div>
);

export const TablePagination = ({ meta, onChange }) => {
  if (!meta || meta.pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm" aria-label="Pages">
      <p className="text-graphite">
        Page {meta.page} of {meta.pages} · {meta.total} in total
      </p>
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={meta.page <= 1} onClick={() => onChange(meta.page - 1)}>
          Previous
        </Button>
        <Button size="sm" variant="outline" disabled={meta.page >= meta.pages} onClick={() => onChange(meta.page + 1)}>
          Next
        </Button>
      </div>
    </nav>
  );
};

export const ErrorNote = ({ error, onRetry }) => (
  <div role="alert" className="flex flex-wrap items-center justify-between gap-4 border border-danger bg-white p-5 text-sm text-danger">
    <p>{error.message}</p>
    {onRetry && (
      <Button size="sm" variant="danger" onClick={onRetry}>
        Try again
      </Button>
    )}
  </div>
);

// ── Confirmation dialog ──────────────────────────────────────────────────

const ConfirmContext = createContext(null);

// Usage: const confirm = useConfirm();
//        if (await confirm({ title, body, confirmLabel, danger })) { ... }
export const ConfirmProvider = ({ children }) => {
  const [options, setOptions] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (next) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOptions(next);
      }),
    [],
  );

  const close = (result) => {
    resolver.current?.(result);
    resolver.current = null;
    setOptions(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Modal open={Boolean(options)} onClose={() => close(false)} title={options?.title || 'Are you sure?'}>
        <div className="p-5 md:p-8">
          <p className="text-graphite">{options?.body}</p>
          <div className="mt-8 flex flex-wrap justify-end gap-3">
            <Button variant="outline" onClick={() => close(false)}>
              {options?.cancelLabel || 'Cancel'}
            </Button>
            <Button variant={options?.danger ? 'danger' : 'solid'} onClick={() => close(true)} data-autofocus>
              {options?.confirmLabel || 'Confirm'}
            </Button>
          </div>
        </div>
      </Modal>
    </ConfirmContext.Provider>
  );
};

export const useConfirm = () => useContext(ConfirmContext);
