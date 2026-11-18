import { env, paystackEnabled } from '../config/env.js';
import { prisma } from '../config/prisma.js';
import { markFailed, markPaid } from '../services/order.service.js';
import * as payments from '../services/payment.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

export const config = (_req, res) =>
  ok(res, {
    provider: paystackEnabled ? 'paystack' : payments.sandboxEnabled ? 'sandbox' : 'unavailable',
    publicKey: env.paystack.publicKey || null,
  });

// Start (or restart) payment for an order that is still awaiting payment.
export const initialize = async (req, res) => {
  const { orderNumber, email } = req.valid.body;
  const order = await prisma.order.findUnique({ where: { orderNumber }, include: { payment: true } });
  if (!order || order.email !== email) throw ApiError.notFound('We couldn’t find that order.');
  ok(res, { orderNumber, authorizationUrl: await payments.retryPayment(order) });
};

export const verify = async (req, res) => ok(res, await payments.verifyPayment(req.valid.body.reference));

// Paystack calls this directly, so a payment is recorded even if the customer
// closes the tab before being redirected back.
export const webhook = async (req, res) => {
  if (!payments.isValidWebhookSignature(req.rawBody, req.get('x-paystack-signature'))) {
    return res.status(401).end();
  }
  const { event, data } = req.body || {};
  try {
    if (event === 'charge.success') {
      await markPaid(data.reference, { channel: data.channel, amountKobo: data.amount });
    } else if (event === 'charge.failed') {
      await markFailed(data.reference, data.gateway_response || 'Payment failed');
    }
  } catch (error) {
    // Unknown references are not ours to retry — acknowledge so Paystack stops resending
    if (error.status !== 404) throw error;
  }
  res.status(200).end();
};

// ── Development sandbox (only when no Paystack key is set, never in production) ──

export const sandboxDetails = async (req, res) => {
  if (!payments.sandboxEnabled) throw ApiError.notFound();
  const payment = await prisma.payment.findUnique({
    where: { reference: req.valid.params.reference },
    include: { order: { select: { orderNumber: true, email: true, status: true } } },
  });
  if (!payment) throw ApiError.notFound('We couldn’t find that payment.');
  ok(res, {
    reference: payment.reference,
    amount: payment.amount,
    status: payment.status,
    orderNumber: payment.order.orderNumber,
    orderStatus: payment.order.status,
    email: payment.order.email,
  });
};

export const sandboxComplete = async (req, res) => {
  const { reference, outcome } = req.valid.body;
  ok(res, await payments.completeSandboxPayment(reference, outcome));
};
