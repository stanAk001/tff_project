// Thin-line icons drawn to match the typography. All are decorative;
// the button or link around them carries the accessible label.
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.2, 'aria-hidden': true };

export const CloseIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
    <path d="M2 2l12 12M14 2L2 14" />
  </svg>
);

export const SearchIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base}>
    <circle cx="7.5" cy="7.5" r="5.5" />
    <path d="M12 12l4.5 4.5" />
  </svg>
);

export const BagIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base}>
    <path d="M2.5 5.5h13l-1 11h-11z" />
    <path d="M6 5.5V4a3 3 0 016 0v1.5" />
  </svg>
);

export const HeartIcon = ({ size = 18, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M9 15.5S2 11.4 2 6.6A3.6 3.6 0 019 5a3.6 3.6 0 017 1.6c0 4.8-7 8.9-7 8.9z" />
  </svg>
);

export const UserIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base}>
    <circle cx="9" cy="6" r="3.5" />
    <path d="M2.5 16.5c.6-3.4 3.2-5 6.5-5s5.9 1.6 6.5 5" />
  </svg>
);

export const MenuIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" {...base}>
    <path d="M1 6.5h18M1 13.5h18" />
  </svg>
);

export const ArrowIcon = ({ size = 16, direction = 'right' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    {...base}
    style={{ transform: { right: 'none', left: 'rotate(180deg)', down: 'rotate(90deg)', up: 'rotate(-90deg)' }[direction] }}
  >
    <path d="M1 8h14M9.5 2.5L15 8l-5.5 5.5" />
  </svg>
);

export const ChevronIcon = ({ size = 12, direction = 'down' }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    {...base}
    style={{ transform: { down: 'none', up: 'rotate(180deg)', left: 'rotate(90deg)', right: 'rotate(-90deg)' }[direction] }}
  >
    <path d="M1.5 4L6 8.5 10.5 4" />
  </svg>
);

export const PlusIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" {...base}>
    <path d="M6 1v10M1 6h10" />
  </svg>
);

export const MinusIcon = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 12 12" {...base}>
    <path d="M1 6h10" />
  </svg>
);

export const CheckIcon = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" {...base} strokeWidth={1.4}>
    <path d="M2 7.5l3.5 3.5L12 3.5" />
  </svg>
);

export const FilterIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...base}>
    <path d="M1 4.5h14M1 11.5h14" />
    <circle cx="5" cy="4.5" r="1.8" fill="var(--color-paper)" />
    <circle cx="11" cy="11.5" r="1.8" fill="var(--color-paper)" />
  </svg>
);

export const StarIcon = ({ size = 14, filled = true }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1">
    <path d="M7 1.2l1.8 3.7 4 .6-2.9 2.8.7 4L7 10.4l-3.6 1.9.7-4L1.2 5.5l4-.6z" />
  </svg>
);
