import { prisma } from '../config/prisma.js';
import { findCart, serializeCart } from '../services/cart.service.js';
import { resolveDiscount } from '../services/discount.service.js';
import { createOrder, markFailed, markPaid, orderInclude } from '../services/order.service.js';
import * as payments from '../services/payment.service.js';
import { deliveryFeeFor, getSettings } from '../services/settings.service.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok, pageMeta } from '../utils/respond.js';

// Live totals for the checkout page — always calculated here, never trusted from the browser.
export const quote = async (req, res) => {
  const { deliveryOptionId, discountCode } = req.valid.body;
  const [cart, settings] = await Promise.all([findCart(req), getSettings()]);
  const { subtotal } = serializeCart(cart);

  let discount = null;
  let discountError = null;
  if (discountCode) {
    try {
      const applied = await resolveDiscount(discountCode, subtotal);
      discount = { code: applied.discount.code, amount: applied.amount };
    } catch (error) {
      if (error.code !== 'INVALID_DISCOUNT') throw error;
      discountError = error.message;
    }
  }

  const delivery = deliveryOptionId ? deliveryFeeFor(settings, deliveryOptionId, subtotal) : null;
  const deliveryFee = delivery?.fee ?? null;

  ok(res, {
    subtotal,
    discount,
    discountError,
    deliveryFee,
    total: subtotal - (discount?.amount ?? 0) + (deliveryFee ?? 0),
    deliveryOptions: settings.delivery.map((option) => ({
      ...option,
      fee: deliveryFeeFor(settings, option.id, subtotal).fee,
    })),
  });
};

export const create = async (req, res) => {
  const { deliveryOptionId, discountCode, saveAddress, ...contact } = req.valid.body;

  const cart = await findCart(req);
  if (!cart) throw ApiError.badRequest('Your bag is empty.', { code: 'EMPTY_CART' });

  const order = await createOrder({
    cartId: cart.id,
    customerId: req.customerId,
    contact,
    deliveryOptionId,
    discountCode,
  });

  if (req.customerId && saveAddress) {
    await prisma.$transaction([
      prisma.address.deleteMany({ where: { customerId: req.customerId, isDefault: true } }),
      prisma.address.create({
        data: {
          customerId: req.customerId,
          fullName: contact.fullName,
          phone: contact.phone,
          line1: contact.addressLine,
          city: contact.city,
          state: contact.state,
          isDefault: true,
        },
      }),
    ]);
  }

  // Nothing to charge (e.g. a 100% code with pickup) — confirm straight away
  if (order.total === 0) {
    await markPaid(order.payment.reference, { channel: 'no-charge', note: 'Order confirmed — nothing to pay' });
    return created(res, { orderNumber: order.orderNumber, authorizationUrl: null });
  }

  try {
    const authorizationUrl = await payments.initializePayment(order);
    created(res, { orderNumber: order.orderNumber, authorizationUrl });
  } catch (error) {
    // Payment couldn't start: put the stock back rather than holding it for nothing
    await markFailed(order.payment.reference, 'Payment could not be started');
    throw error;
  }
};

export const mine = async (req, res) => {
  const { page, limit } = req.valid.query;
  const where = { customerId: req.customerId };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { items: { select: { name: true, imageUrl: true, quantity: true } } },
    }),
    prisma.order.count({ where }),
  ]);
  ok(res, orders, pageMeta(page, limit, total));
};

// Order numbers are random, but we still ask for the email unless the signed-in
// customer owns the order — so a leaked link alone reveals nothing.
export const track = async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { orderNumber: req.valid.params.orderNumber.toUpperCase() },
    include: orderInclude,
  });
  const email = req.valid.query.email;
  const ownsIt = order && req.customerId && order.customerId === req.customerId;
  const emailMatches = order && email && order.email === email;

  if (!order || (!ownsIt && !emailMatches)) {
    throw ApiError.notFound(
      email
        ? 'We couldn’t find an order with that number and email.'
        : 'Enter the email used for this order to view it.',
    );
  }

  const { customerId, cartId, discountId, stockReleased, ...safe } = order;
  ok(res, safe);
};
