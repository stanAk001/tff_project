import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { newOrderNumber, newPaymentReference } from '../utils/tokens.js';
import { imageForVariant } from './cart.service.js';
import { resolveDiscount } from './discount.service.js';
import { sendOrderConfirmation, sendOrderShipped } from './email.service.js';
import { deliveryFeeFor, getSettings } from './settings.service.js';

// Unpaid orders hold their stock for this long before it goes back on sale.
const RESERVATION_MINUTES = 45;

export const orderInclude = {
  items: true,
  payment: { select: { reference: true, status: true, channel: true, paidAt: true, provider: true } },
  events: { orderBy: { createdAt: 'asc' } },
};

// What an admin is allowed to move an order to from each state.
export const NEXT_STATUSES = {
  PENDING: ['PAID', 'CANCELLED'],
  PAID: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

// ── Stock helpers (always run inside a transaction) ──────────────────────

const releaseStock = async (tx, order) => {
  if (order.stockReleased) return;
  for (const item of order.items) {
    if (!item.variantId) continue;
    await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
  }
};

const cancelInTx = async (tx, order, note) => {
  await releaseStock(tx, order);
  await tx.order.update({
    where: { id: order.id },
    data: { status: 'CANCELLED', stockReleased: true, events: { create: { status: 'CANCELLED', note } } },
  });
  await tx.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'FAILED' } });
};

// ── Checkout ─────────────────────────────────────────────────────────────

export const createOrder = async ({ cartId, customerId, contact, deliveryOptionId, discountCode }) => {
  const settings = await getSettings();

  return prisma.$transaction(async (tx) => {
    const items = await tx.cartItem.findMany({
      where: { cartId, savedForLater: false },
      include: {
        variant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                status: true,
                images: { orderBy: { position: 'asc' }, select: { url: true, colour: true } },
              },
            },
          },
        },
      },
    });
    if (!items.length) throw ApiError.badRequest('Your bag is empty.', { code: 'EMPTY_CART' });

    // A new checkout attempt replaces any unpaid one from the same bag
    const stale = await tx.order.findMany({ where: { cartId, status: 'PENDING' }, include: { items: true } });
    for (const order of stale) await cancelInTx(tx, order, 'Replaced by a newer checkout attempt');

    // Reserve stock. The conditional update is atomic, so two shoppers can never
    // both take the last piece.
    for (const item of items) {
      const { variant } = item;
      const label = `${variant.product.name} (${variant.colour} / ${variant.size})`;
      if (variant.product.status !== 'PUBLISHED') {
        throw ApiError.conflict(`${label} is no longer available.`, { code: 'OUT_OF_STOCK' });
      }
      const reserved = await tx.productVariant.updateMany({
        where: { id: variant.id, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (reserved.count === 0) {
        const fresh = await tx.productVariant.findUnique({ where: { id: variant.id }, select: { stock: true } });
        const left = fresh?.stock ?? 0;
        throw ApiError.conflict(
          left === 0 ? `${label} has just sold out.` : `Only ${left} left of ${label}.`,
          { code: 'OUT_OF_STOCK' },
        );
      }
    }

    const subtotal = items.reduce((sum, item) => sum + item.variant.product.price * item.quantity, 0);
    const applied = discountCode ? await resolveDiscount(discountCode, subtotal, tx) : null;
    const discountTotal = applied?.amount ?? 0;

    const delivery = deliveryFeeFor(settings, deliveryOptionId, subtotal);
    if (!delivery) throw ApiError.badRequest('Choose a delivery option.');

    const total = subtotal - discountTotal + delivery.fee;
    const orderNumber = newOrderNumber();

    return tx.order.create({
      data: {
        orderNumber,
        customerId,
        cartId,
        ...contact,
        deliveryOption: delivery.option.name,
        deliveryFee: delivery.fee,
        subtotal,
        discountTotal,
        total,
        discountId: applied?.discount.id,
        discountCode: applied?.discount.code,
        items: {
          create: items.map(({ variant, quantity }) => ({
            productId: variant.product.id,
            variantId: variant.id,
            name: variant.product.name,
            slug: variant.product.slug,
            colour: variant.colour,
            size: variant.size,
            sku: variant.sku,
            imageUrl: imageForVariant(variant.product, variant.colour),
            unitPrice: variant.product.price,
            quantity,
          })),
        },
        events: { create: { status: 'PENDING', note: 'Order placed — awaiting payment' } },
        payment: { create: { reference: newPaymentReference(orderNumber), amount: total } },
      },
      include: orderInclude,
    });
  });
};

// ── Payment outcomes ─────────────────────────────────────────────────────

// Idempotent: safe to call from the redirect, the webhook and the sweep at the same time.
export const markPaid = async (reference, { channel = null, amountKobo = null, note = 'Payment confirmed' } = {}) => {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw ApiError.notFound('We couldn’t find that payment.');
    if (payment.status === 'SUCCESS') return { orderId: payment.orderId, fresh: false };

    if (amountKobo != null && amountKobo < payment.amount * 100) {
      throw ApiError.badRequest('The amount paid does not match this order.', { code: 'AMOUNT_MISMATCH' });
    }

    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: 'SUCCESS' } },
      data: { status: 'SUCCESS', channel, paidAt: new Date() },
    });
    if (claimed.count === 0) return { orderId: payment.orderId, fresh: false };

    const { order } = payment;
    let eventNote = note;

    // Paid after the reservation lapsed: take the stock again if it is still there
    if (order.stockReleased) {
      let short = false;
      for (const item of order.items) {
        if (!item.variantId) continue;
        const taken = await tx.productVariant.updateMany({
          where: { id: item.variantId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (taken.count === 0) short = true;
      }
      if (short) eventNote += ' — paid after the stock hold expired; check availability before dispatch';
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        stockReleased: false,
        events: { create: { status: 'PAID', note: eventNote } },
      },
    });

    for (const item of order.items) {
      if (!item.productId) continue;
      await tx.product.update({ where: { id: item.productId }, data: { salesCount: { increment: item.quantity } } });
    }
    if (order.discountId) {
      await tx.discount.update({ where: { id: order.discountId }, data: { usedCount: { increment: 1 } } });
    }
    if (order.cartId) {
      const variantIds = order.items.map((item) => item.variantId).filter(Boolean);
      await tx.cartItem.deleteMany({
        where: { cartId: order.cartId, savedForLater: false, variantId: { in: variantIds } },
      });
    }
    return { orderId: order.id, fresh: true };
  });

  const order = await prisma.order.findUnique({ where: { id: result.orderId }, include: orderInclude });
  if (result.fresh) await sendOrderConfirmation(order);
  return order;
};

export const markFailed = async (reference, note = 'Payment was not completed') => {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { reference },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw ApiError.notFound('We couldn’t find that payment.');
    if (payment.status === 'SUCCESS' || payment.order.status !== 'PENDING') return;
    await cancelInTx(tx, payment.order, note);
  });
};

// ── Admin status changes ─────────────────────────────────────────────────

export const updateOrderStatus = async (orderId, { status, trackingNumber, note }) => {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true, payment: true } });
  if (!order) throw ApiError.notFound('That order no longer exists.');
  if (!NEXT_STATUSES[order.status].includes(status)) {
    throw ApiError.badRequest(`An order that is ${order.status.toLowerCase()} can’t be moved to ${status.toLowerCase()}.`);
  }

  if (status === 'PAID') {
    await markPaid(order.payment.reference, { channel: 'manual', note: note || 'Marked as paid by the store' });
  } else if (status === 'CANCELLED') {
    await prisma.$transaction((tx) => cancelInTx(tx, order, note || 'Cancelled by the store — items returned to stock'));
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        ...(trackingNumber ? { trackingNumber } : {}),
        events: { create: { status, note: note || null } },
      },
    });
  }

  const updated = await prisma.order.findUnique({ where: { id: orderId }, include: orderInclude });
  if (status === 'SHIPPED') await sendOrderShipped(updated);
  return updated;
};

// ── Housekeeping ─────────────────────────────────────────────────────────

// Returns unpaid orders whose stock hold has run out. `confirmUnpaid` lets the caller
// double-check with the payment gateway before anything is cancelled.
export const expireStaleOrders = async (confirmUnpaid) => {
  const cutoff = new Date(Date.now() - RESERVATION_MINUTES * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { status: 'PENDING', stockReleased: false, createdAt: { lt: cutoff } },
    include: { payment: true },
    take: 50,
  });

  for (const order of stale) {
    try {
      const stillUnpaid = order.payment ? await confirmUnpaid(order.payment.reference) : true;
      if (stillUnpaid && order.payment) {
        await markFailed(order.payment.reference, 'Payment window expired — items returned to stock');
      }
    } catch (error) {
      console.error(`[orders] Could not expire ${order.orderNumber}:`, error.message);
    }
  }
  return stale.length;
};
