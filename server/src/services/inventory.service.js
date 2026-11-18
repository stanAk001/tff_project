import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { sendBackInStock } from './email.service.js';

// Emails everyone who asked to be told when these variants are available again.
export const notifyRestocked = async (variantIds) => {
  if (!variantIds.length) return 0;
  const pending = await prisma.stockNotification.findMany({
    where: { variantId: { in: variantIds }, notifiedAt: null, variant: { stock: { gt: 0 } } },
    include: { variant: { include: { product: { select: { name: true, slug: true } } } } },
  });
  if (!pending.length) return 0;

  await Promise.all(
    pending.map((entry) =>
      sendBackInStock({ email: entry.email, product: entry.variant.product, variant: entry.variant }),
    ),
  );
  await prisma.stockNotification.updateMany({
    where: { id: { in: pending.map((entry) => entry.id) } },
    data: { notifiedAt: new Date() },
  });
  return pending.length;
};

export const setVariantStock = async (variantId, stock) => {
  const before = await prisma.productVariant.findUnique({ where: { id: variantId } });
  if (!before) throw ApiError.notFound('That variant no longer exists.');

  const variant = await prisma.productVariant.update({ where: { id: variantId }, data: { stock } });
  const notified = before.stock === 0 && stock > 0 ? await notifyRestocked([variantId]) : 0;
  return { variant, notified };
};

export const listInventory = async ({ q, filter, lowStockThreshold, page, limit }) => {
  const where = {
    product: { status: { not: 'ARCHIVED' } },
    ...(q
      ? {
          OR: [
            { sku: { contains: q, mode: 'insensitive' } },
            { product: { name: { contains: q, mode: 'insensitive' } } },
          ],
        }
      : {}),
    ...(filter === 'out' ? { stock: 0 } : {}),
    ...(filter === 'low' ? { stock: { gt: 0, lte: lowStockThreshold } } : {}),
  };

  const [rows, total, outCount, lowCount] = await Promise.all([
    prisma.productVariant.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, slug: true, status: true, images: { orderBy: { position: 'asc' }, take: 1 } },
        },
        _count: { select: { stockNotifications: { where: { notifiedAt: null } } } },
      },
      orderBy: [{ product: { name: 'asc' } }, { colour: 'asc' }, { size: 'asc' }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.productVariant.count({ where }),
    prisma.productVariant.count({ where: { stock: 0, product: { status: { not: 'ARCHIVED' } } } }),
    prisma.productVariant.count({
      where: { stock: { gt: 0, lte: lowStockThreshold }, product: { status: { not: 'ARCHIVED' } } },
    }),
  ]);

  return { rows, total, outCount, lowCount };
};
