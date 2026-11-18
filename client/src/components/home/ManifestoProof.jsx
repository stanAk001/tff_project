import { animate, motion, useMotionValueEvent, useTransform } from 'motion/react';
import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { resized } from '../../utils/media.js';
import { ArrowIcon } from '../ui/Icons.jsx';

// Pieces of the brand statement that turn its words into evidence.

// ── The seam ─────────────────────────────────────────────────────────────
// A line of stitches that sews itself across the frame as the reader scrolls,
// led by a needle point — "made properly", drawn rather than claimed.

const SEAM = 'M0 22 C 120 6, 210 38, 330 22 S 540 6, 660 22 S 880 38, 1000 18';

export const Seam = ({ progress, range }) => {
  const maskId = useId();
  const pathRef = useRef(null);
  const draw = useTransform(progress, range, [0, 1]);
  const opacity = useTransform(progress, [range[0] - 0.02, range[0] + 0.02, range[1] + 0.04, range[1] + 0.08], [0, 1, 1, 0.35]);
  const [needle, setNeedle] = useState({ x: 0, y: 22, on: false });

  // Keep the needle point at the end of the drawn thread
  useMotionValueEvent(draw, 'change', (value) => {
    const path = pathRef.current;
    if (!path) return;
    const point = path.getPointAtLength(path.getTotalLength() * value);
    setNeedle({ x: point.x, y: point.y, on: value > 0.001 && value < 0.999 });
  });

  return (
    <motion.div className="pointer-events-none absolute inset-x-0 top-[17%] h-11" style={{ opacity }} aria-hidden="true">
      <svg viewBox="0 0 1000 44" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="-10" y="-10" width="1020" height="64">
            <motion.path d={SEAM} fill="none" stroke="white" strokeWidth="12" style={{ pathLength: draw }} />
          </mask>
        </defs>
        {/* Faint guide line where the seam will run */}
        <path d={SEAM} fill="none" stroke="rgba(245,242,237,0.12)" strokeWidth="1" vectorEffect="non-scaling-stroke" />
        {/* The stitches: dashes revealed by the growing mask */}
        <path
          ref={pathRef}
          d={SEAM}
          fill="none"
          stroke="#f5f2ed"
          strokeWidth="1.6"
          strokeDasharray="9 7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          mask={`url(#${maskId})`}
        />
      </svg>
      {needle.on && (
        <span
          className="absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-paper shadow-[0_0_14px_3px_rgba(245,242,237,0.55)]"
          style={{ left: `${needle.x / 10}%`, top: `${(needle.y / 44) * 100}%` }}
        />
      )}
    </motion.div>
  );
};

// ── The whole range ──────────────────────────────────────────────────────
// Every published piece, laid out small in one line: the collection really is
// this short. Each thumbnail rises into place in turn and links to the piece.

const Piece = ({ piece, progress, range }) => {
  const opacity = useTransform(progress, range, [0, 1]);
  const y = useTransform(progress, range, [28, 0]);
  return (
    <motion.li style={{ opacity, y }} className="w-[clamp(2.4rem,4.6vw,4.75rem)] shrink-0">
      <Link to={`/products/${piece.slug}`} className="group block" title={piece.name} aria-label={piece.name}>
        <span className="relative block aspect-[4/5] overflow-hidden bg-charcoal outline-1 outline-offset-2 outline-transparent transition-[outline-color] group-hover:outline-paper">
          {piece.imageUrl && <img src={resized(piece.imageUrl, 160)} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />}
        </span>
      </Link>
    </motion.li>
  );
};

export const WholeRange = ({ pieces, progress, range, phone }) => {
  const [start, end] = range;
  const shown = pieces.slice(0, phone ? 7 : 20);
  const hidden = pieces.length - shown.length;
  const span = (end - start) * 0.55;
  const opacity = useTransform(progress, [start, start + 0.02, end - 0.03, end], [0, 1, 1, 0]);

  return (
    <motion.div className="absolute inset-x-0 bottom-[13%] flex flex-col items-center gap-4 px-5" style={{ opacity }}>
      <p className="eyebrow text-[0.625rem] text-paper/70">
        {pieces.length} {pieces.length === 1 ? 'piece' : 'pieces'}. The whole collection.
      </p>
      <ul className="flex items-end gap-1.5 md:gap-2" aria-label="Every piece in the collection">
        {shown.map((piece, index) => {
          const at = start + 0.02 + (span * index) / Math.max(1, shown.length);
          return <Piece key={piece.id} piece={piece} progress={progress} range={[at, at + 0.03]} />;
        })}
        {hidden > 0 && (
          <li className="pb-2 pl-1">
            <Link to="/shop" className="eyebrow text-[0.625rem] text-paper/80 underline-offset-4 hover:underline">
              +{hidden}
            </Link>
          </li>
        )}
      </ul>
    </motion.div>
  );
};

// ── Live stock ───────────────────────────────────────────────────────────
// The current drop's real remaining stock, counted up as the last line lands.
// Straight from inventory, so it only ever says what is true.

export const LiveStock = ({ drop, progress, from }) => {
  const [shown, setShown] = useState(0);
  const running = useRef(null);
  const started = useRef(false);

  useMotionValueEvent(progress, 'change', (value) => {
    if (value >= from && !started.current) {
      started.current = true;
      running.current = animate(0, drop.left, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: (v) => setShown(Math.round(v)) });
    } else if (value < from - 0.06 && started.current) {
      started.current = false;
      running.current?.stop();
      setShown(0);
    }
  });
  useEffect(() => () => running.current?.stop(), []);

  const label = drop.dropNumber ? `Drop ${String(drop.dropNumber).padStart(3, '0')}` : drop.name;

  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <p className="eyebrow flex items-center gap-2.5 text-[0.625rem] text-paper/70">
        <span className="relative flex size-1.5" aria-hidden="true">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-paper/70" />
          <span className="relative inline-flex size-1.5 rounded-full bg-paper" />
        </span>
        Live stock — {label}
      </p>
      <p className="display text-[clamp(1.75rem,3vw,2.75rem)] leading-none">
        <span className="tabular-nums">{shown.toLocaleString('en-NG')}</span> {drop.left === 1 ? 'piece' : 'pieces'} left
        <span className="sr-only"> across {drop.pieces} styles</span>
      </p>
    </div>
  );
};

// ── Film details ─────────────────────────────────────────────────────────

// Running timecode taken from the footage itself (hh:mm:ss:ff at 25 fps)
export const Timecode = ({ videoRef }) => {
  const [code, setCode] = useState('00:00:00:00');
  useEffect(() => {
    let frame;
    const tick = () => {
      const t = videoRef.current?.currentTime ?? 0;
      const pad = (n) => String(Math.floor(n)).padStart(2, '0');
      setCode(`${pad(t / 3600)}:${pad((t / 60) % 60)}:${pad(t % 60)}:${pad((t % 1) * 25)}`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [videoRef]);
  return <span className="tabular-nums">{code}</span>;
};

// A faint, moving film grain over the footage
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const Grain = ({ opacity }) => (
  <motion.div
    className="pointer-events-none absolute -inset-[10%] mix-blend-overlay [animation:grain_0.9s_steps(4)_infinite]"
    style={{ backgroundImage: GRAIN, opacity }}
    aria-hidden="true"
  />
);

export const ShopDropLink = ({ drop }) => (
  <Link
    to={`/collections/${drop.slug}`}
    className="group eyebrow pointer-events-auto inline-flex h-13 items-center gap-4 bg-paper px-7 text-ink transition-colors hover:bg-white"
  >
    Shop the drop
    <span className="transition-transform duration-500 ease-out-expo group-hover:translate-x-1">
      <ArrowIcon size={14} />
    </span>
  </Link>
);
