import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/respond.js';

export const subscribe = async (req, res) => {
  const { email } = req.valid.body;
  await prisma.newsletterSubscriber.upsert({
    where: { email },
    create: { email },
    update: { active: true },
  });
  // Same answer whether or not they were already subscribed
  ok(res, { subscribed: true });
};

export const notifyWhenAvailable = async (req, res) => {
  const { email, variantId } = req.valid.body;
  const variant = await prisma.productVariant.findUnique({ where: { id: variantId }, select: { stock: true } });
  if (!variant) throw ApiError.notFound('That piece is no longer available.');
  if (variant.stock > 0) throw ApiError.badRequest('Good news — this one is in stock now.');

  await prisma.stockNotification.upsert({
    where: { email_variantId: { email, variantId } },
    create: { email, variantId },
    update: { notifiedAt: null },
  });
  created(res, { subscribed: true });
};

export const createReview = async (req, res) => {
  const { productId, rating, title, comment } = req.valid.body;
  const product = await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' }, select: { id: true } });
  if (!product) throw ApiError.notFound('That piece is no longer available.');

  const existing = await prisma.review.findUnique({
    where: { productId_customerId: { productId, customerId: req.customerId } },
  });
  if (existing) throw ApiError.conflict('You’ve already reviewed this piece.');

  await prisma.review.create({ data: { productId, customerId: req.customerId, rating, title, comment } });
  created(res, { status: 'PENDING' });
};
