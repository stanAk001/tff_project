import { Router } from 'express';
import { z } from 'zod';
import * as orders from '../controllers/order.controller.js';
import * as payments from '../controllers/payment.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { checkoutLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, pagination, requiredText } from '../utils/schemas.js';

const discountCode = z.string().trim().max(40).optional().or(z.literal('')).transform((v) => v || undefined);

const quoteBody = z.object({ deliveryOptionId: z.string().max(40).optional(), discountCode });

const orderBody = z.object({
  fullName: requiredText('Full name', 120),
  email,
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9\s-]{7,20}$/, 'Enter a valid phone number.'),
  addressLine: requiredText('Address', 240),
  city: requiredText('City', 80),
  state: requiredText('State', 80),
  deliveryOptionId: requiredText('Delivery option', 40),
  discountCode,
  saveAddress: z.boolean().default(false),
});

const reference = z.string().trim().min(6).max(60);

const router = Router();

router.post('/orders/quote', validate({ body: quoteBody }), orders.quote);
router.post('/orders', checkoutLimiter, validate({ body: orderBody }), orders.create);
router.get('/orders', requireCustomer, validate({ query: z.object(pagination(10, 30)) }), orders.mine);
router.get(
  '/orders/:orderNumber',
  checkoutLimiter,
  validate({
    params: z.object({ orderNumber: z.string().min(6).max(20) }),
    query: z.object({ email: email.optional() }),
  }),
  orders.track,
);

router.get('/payments/config', payments.config);
router.post(
  '/payments/initialize',
  checkoutLimiter,
  validate({ body: z.object({ orderNumber: z.string().min(6).max(20), email }) }),
  payments.initialize,
);
router.post('/payments/verify', checkoutLimiter, validate({ body: z.object({ reference }) }), payments.verify);
router.post('/payments/webhook', payments.webhook);
router.get('/payments/sandbox/:reference', validate({ params: z.object({ reference }) }), payments.sandboxDetails);
router.post(
  '/payments/sandbox',
  validate({ body: z.object({ reference, outcome: z.enum(['success', 'failed']) }) }),
  payments.sandboxComplete,
);

export default router;
