
import crypto from 'node:crypto';
import { env, paystackEnabled } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { newPaymentReference } from '../utils/tokens.js';
import { markFailed, markPaid } from './order.service.js';

const PAYSTACK_URL = 'https://api.paystack.co';

// Without Paystack keys, development uses a local stand-in so the whole order flow
// can still be exercised. It is never available in production.
export const sandboxEnabled = !paystackEnabled && !env.isProduction;

const paystack = async (path, options = {}) => {
  let response;
  try {
    response = await fetch(`${PAYSTACK_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${env.paystack.secretKey}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(20000),
    });
    
  } catch {
    throw new ApiError(502, 'We couldn’t reach the payment provider. Please try again.', { code: 'PAYMENT_UNAVAILABLE' });
  }
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.status) {
    throw new ApiError(502, body?.message || 'The payment provider returned an error.', { code: 'PAYMENT_ERROR' });
  }
  return body.data;
};

// Returns the URL the customer should be sent to in order to pay.
export const initializePayment = async (order) => {
  const reference = order.payment.reference;

  if (paystackEnabled) {
    const data = await paystack('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        email: order.email,
        amount: order.total * 100, // Paystack works in kobo
        currency: 'NGN',
        reference,
        callback_url: `${env.clientUrl}/checkout/verify`,
        metadata: { orderNumber: order.orderNumber, customerName: order.fullName },
      }),
    });
    return data.authorization_url;
  }

  if (sandboxEnabled) {
    return `${env.clientUrl}/checkout/sandbox?reference=${encodeURIComponent(reference)}`;
  }

  throw new ApiError(503, 'Online payment is not available right now. Please try again later.', {
    code: 'PAYMENT_UNAVAILABLE',
  });
};

// A payment reference can only be initialised once, so retrying needs a fresh one.
export const retryPayment = async (order) => {
  if (order.status !== 'PENDING') throw ApiError.badRequest('This order can no longer be paid for.');
  const payment = await prisma.payment.update({
    where: { orderId: order.id },
    data: { reference: newPaymentReference(order.orderNumber), status: 'PENDING' },
  });
  return initializePayment({ ...order, payment });
};

// Asks Paystack what really happened and applies the result. Returns the order's state afterwards.
export const verifyPayment = async (reference) => {
  const payment = await prisma.payment.findUnique({
    where: { reference },
    include: { order: { select: { orderNumber: true, status: true } } },
  });
  if (!payment) throw ApiError.notFound('We couldn’t find that payment.');

  if (payment.status === 'SUCCESS') return { outcome: 'success', orderNumber: payment.order.orderNumber };

  if (paystackEnabled) {
    const data = await paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
    if (data.status === 'success') {
      await markPaid(reference, { channel: data.channel, amountKobo: data.amount });
      return { outcome: 'success', orderNumber: payment.order.orderNumber };
    }
    if (data.status === 'failed' || data.status === 'reversed') {
      await markFailed(reference, data.gateway_response || 'Payment failed');
      return { outcome: 'failed', orderNumber: payment.order.orderNumber };
    }
    // abandoned / ongoing / pending — the customer can still complete or retry
    return { outcome: 'pending', orderNumber: payment.order.orderNumber };
  }

  const outcome = payment.order.status === 'CANCELLED' ? 'failed' : 'pending';
  return { outcome, orderNumber: payment.order.orderNumber };
};

// Used by the expiry sweep: true when it is safe to cancel the order.
export const confirmUnpaid = async (reference) => {
  if (!paystackEnabled) return true;
  const result = await verifyPayment(reference).catch(() => ({ outcome: 'unknown' }));
  return result.outcome === 'pending' || result.outcome === 'failed';
};

export const isValidWebhookSignature = (rawBody, signature) => {
  if (!paystackEnabled || !rawBody || !signature) return false;
  const expected = crypto.createHmac('sha512', env.paystack.secretKey).update(rawBody).digest('hex');
  const a = Buffer.from(expected);
  const b = Buffer.from(String(signature));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const completeSandboxPayment = async (reference, outcome) => {
  if (!sandboxEnabled) throw ApiError.notFound();
  if (outcome === 'success') {
    const order = await markPaid(reference, { channel: 'sandbox', note: 'Payment confirmed (development sandbox)' });
    return { outcome: 'success', orderNumber: order.orderNumber };
  }
  await markFailed(reference, 'Payment declined (development sandbox)');
  const payment = await prisma.payment.findUnique({ where: { reference }, include: { order: true } });
  return { outcome: 'failed', orderNumber: payment.order.orderNumber };
};
