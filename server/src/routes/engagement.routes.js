import { Router } from 'express';
import { z } from 'zod';
import * as engagement from '../controllers/engagement.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { formLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, requiredText } from '../utils/schemas.js';

const reviewBody = z.object({
  productId: z.string().min(1).max(40),
  rating: z.coerce.number().int().min(1, 'Choose a rating.').max(5),
  title: requiredText('A title', 100),
  comment: requiredText('Your review', 1500),
});

const router = Router();

router.post('/newsletter', formLimiter, validate({ body: z.object({ email }) }), engagement.subscribe);
router.post(
  '/stock-notifications',
  formLimiter,
  validate({ body: z.object({ email, variantId: z.string().min(1).max(40) }) }),
  engagement.notifyWhenAvailable,
);
router.post('/reviews', formLimiter, requireCustomer, validate({ body: reviewBody }), engagement.createReview);

export default router;
