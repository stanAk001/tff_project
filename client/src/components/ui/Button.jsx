import { Link } from 'react-router';
import { cx } from '../../utils/format.js';

const VARIANTS = {
  solid: 'bg-ink text-paper border border-ink hover:bg-charcoal hover:border-charcoal disabled:bg-mist disabled:border-mist disabled:text-graphite',
  outline: 'border border-ink text-ink hover:bg-ink hover:text-paper disabled:border-mist disabled:text-stone disabled:hover:bg-transparent',
  light: 'bg-paper text-ink border border-paper hover:bg-white hover:border-white',
  'outline-light': 'border border-paper/70 text-paper hover:bg-paper hover:text-ink',
  danger: 'border border-danger text-danger hover:bg-danger hover:text-white',
};

const SIZES = {
  sm: 'h-10 px-5',
  md: 'h-13 px-8',
  lg: 'h-14 px-10',
};

// One button for the whole site. Renders a link when `to` or `href` is given.
const Button = ({
  variant = 'solid',
  size = 'md',
  full = false,
  loading = false,
  to,
  href,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const classes = cx(
    'eyebrow relative inline-flex select-none items-center justify-center gap-3 whitespace-nowrap transition-colors duration-300',
    VARIANTS[variant],
    SIZES[size],
    full && 'w-full',
    className,
  );

  const content = (
    <>
      <span className={cx('inline-flex items-center gap-3', loading && 'invisible')}>{children}</span>
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center" aria-hidden="true">
          <span className="size-4 animate-spin rounded-full border border-current border-t-transparent" />
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {content}
    </button>
  );
};

export default Button;
