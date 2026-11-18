import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';

const invalid = (message) => new ApiError(400, message, { code: 'INVALID_DISCOUNT' });

// Checks a code against an order subtotal and returns the naira amount to take off.
// `db` can be the prisma client or a transaction.
export const resolveDiscount = async (code, subtotal, db = prisma) => {
  const discount = await db.discount.findUnique({ where: { code: code.trim().toUpperCase() } });

  if (!discount || !discount.active) throw invalid('That code isn’t valid.');
  if (discount.expiresAt && discount.expiresAt < new Date()) throw invalid('That code has expired.');
  if (discount.usageLimit != null && discount.usedCount >= discount.usageLimit) {
    throw invalid('That code has reached its limit.');
  }
  if (subtotal < discount.minOrderAmount) {
    throw invalid(`That code applies to orders of ₦${discount.minOrderAmount.toLocaleString('en-NG')} or more.`);
  }

  const raw = discount.type === 'PERCENTAGE' ? Math.floor((subtotal * discount.value) / 100) : discount.value;
  return { discount, amount: Math.min(raw, subtotal) };
};

