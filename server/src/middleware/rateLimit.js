import rateLimit from 'express-rate-limit';

const limiter = (windowMs, limit, message) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { success: false, error: { message, code: 'RATE_LIMITED' } },
  });

const MINUTE = 60 * 1000;

export const apiLimiter = limiter(15 * MINUTE, 1500, 'Too many requests. Please slow down.');
export const authLimiter = limiter(
  15 * MINUTE,
  20,
  'Too many sign-in attempts. Please wait a few minutes and try again.',
);
export const formLimiter = limiter(60 * MINUTE, 30, 'Too many submissions. Please try again later.');
export const checkoutLimiter = limiter(15 * MINUTE, 80, 'Too many checkout attempts. Please wait a moment.');
