import { useCountdown } from '../hooks/useUi.js';
import { cx, formatDate } from '../utils/format.js';

const pad = (value) => String(value).padStart(2, '0');

// Live countdown to a drop's launch date. When the moment arrives it calls
// `onComplete` once (pages use this to reload and reveal the collection).
const Countdown = ({ to, className, size = 'lg' }) => {
  const remaining = useCountdown(to);
  if (!remaining) return null;

  const units = [
    ['Days', remaining.days],
    ['Hours', remaining.hours],
    ['Mins', remaining.minutes],
    ['Secs', remaining.seconds],
  ];

  return (
    <div
      className={cx('flex', size === 'lg' ? 'gap-6 md:gap-10' : 'gap-5', className)}
      role="timer"
      aria-label={`Launches ${formatDate(to, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}`}
    >
      {units.map(([label, value]) => (
        <div key={label} aria-hidden="true">
          <p className={cx('display tabular-nums', size === 'lg' ? 'text-5xl md:text-7xl' : 'text-3xl')}>{pad(value)}</p>
          <p className="eyebrow mt-2 text-[0.5625rem] opacity-60">{label}</p>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
