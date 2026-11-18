import { cx } from '../../utils/format.js';
import Button from './Button.jsx';
import { StarIcon } from './Icons.jsx';

export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} aria-hidden="true" />;

export const ProductCardSkeleton = () => (
  <div aria-hidden="true">
    <Skeleton className="aspect-[4/5] w-full" />
    <Skeleton className="mt-4 h-3 w-2/3" />
    <Skeleton className="mt-2 h-3 w-1/4" />
  </div>
);

export const ProductGridSkeleton = ({ count = 8, className }) => (
  <div
    className={cx('grid grid-cols-2 gap-x-3 gap-y-10 md:gap-x-5 md:gap-y-14 lg:grid-cols-3 xl:grid-cols-4', className)}
    role="status"
    aria-label="Loading pieces"
  >
    {Array.from({ length: count }, (_, index) => (
      <ProductCardSkeleton key={index} />
    ))}
  </div>
);

// A calm, centred message with optional actions. Used for every empty and
// error state so they all feel like part of the same brand.
export const StateMessage = ({ eyebrow, title, body, children, className, tone = 'default' }) => (
  <div className={cx('mx-auto flex max-w-lg flex-col items-center px-5 py-20 text-center md:py-28', className)}>
    {eyebrow && <p className={cx('eyebrow mb-5', tone === 'error' ? 'text-danger' : 'text-stone')}>{eyebrow}</p>}
    <h2 className="display text-4xl md:text-5xl">{title}</h2>
    {body && <p className="mt-5 max-w-sm text-graphite">{body}</p>}
    {children && <div className="mt-9 flex flex-wrap items-center justify-center gap-3">{children}</div>}
  </div>
);

export const ErrorState = ({ error, onRetry, title }) => {
  const offline = error?.code === 'NETWORK_ERROR';
  return (
    <StateMessage
      tone="error"
      eyebrow={offline ? 'Connection lost' : 'Something went wrong'}
      title={title || (offline ? 'We can’t reach TFF.' : 'That didn’t load.')}
      body={error?.message}
    >
      {onRetry && <Button onClick={onRetry}>Try again</Button>}
      <Button variant="outline" to="/">
        Back to home
      </Button>
    </StateMessage>
  );
};

export const Stars = ({ rating = 0, size = 13, className }) => (
  <span className={cx('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((value) => (
      <StarIcon key={value} size={size} filled={value <= Math.round(rating)} />
    ))}
  </span>
);

export const Pagination = ({ page, pages, onChange }) => {
  if (!pages || pages <= 1) return null;
  return (
    <nav className="mt-16 flex items-center justify-center gap-8" aria-label="Pages">
      <button
        type="button"
        className="eyebrow link disabled:opacity-30"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
      >
        Previous
      </button>
      <span className="text-sm tabular-nums text-graphite">
        {String(page).padStart(2, '0')} / {String(pages).padStart(2, '0')}
      </span>
      <button
        type="button"
        className="eyebrow link disabled:opacity-30"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
};
