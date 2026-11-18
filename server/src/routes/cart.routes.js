import { Router } from 'express';
import { z } from 'zod';
import * as cart from '../controllers/cart.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { MAX_QUANTITY } from '../services/cart.service.js';
import { idParam } from '../utils/schemas.js';

const quantity = z.coerce.number().int().min(1).max(MAX_QUANTITY, `You can add up to ${MAX_QUANTITY} of each piece.`);

const addBody = z.object({ variantId: z.string().min(1).max(40), quantity: quantity.default(1) });
const updateBody = z
  .object({ quantity: quantity.optional(), savedForLater: z.boolean().optional() })
  .refine((body) => body.quantity != null || body.savedForLater != null, 'Nothing to update.');

const router = Router();

router.get('/cart', cart.getCart);
router.post('/cart/items', validate({ body: addBody }), cart.addItem);
router.patch('/cart/items/:id', validate({ params: idParam, body: updateBody }), cart.updateItem);
router.delete('/cart/items/:id', validate({ params: idParam }), cart.removeItem);

router.get('/wishlist', requireCustomer, cart.getWishlist);
router.post(
  '/wishlist',
  requireCustomer,
  validate({ body: z.object({ productId: z.string().min(1).max(40) }) }),
  cart.addToWishlist,
);
router.delete('/wishlist/:id', requireCustomer, validate({ params: idParam }), cart.removeFromWishlist);

export default router;
