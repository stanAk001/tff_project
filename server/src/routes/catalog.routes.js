import { Router } from 'express';
import { z } from 'zod';
import * as catalog from '../controllers/catalog.controller.js';
import { validate } from '../middleware/validate.js';
import { csv, flag, pagination, slugParam } from '../utils/schemas.js';

const productQuery = z.object({
  ...pagination(24, 48),
  q: z.string().trim().max(80).optional(),
  category: z.string().max(100).optional(),
  collection: z.string().max(100).optional(),
  gender: z.enum(['MEN', 'WOMEN', 'UNISEX']).optional(),
  sizes: csv,
  colours: csv,
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  availability: z.enum(['in_stock', 'sold_out']).optional(),
  sort: z.enum(['featured', 'newest', 'price_asc', 'price_desc', 'popular']).default('featured'),
  featured: flag,
  isNew: flag,
});

const router = Router();

router.get('/products', validate({ query: productQuery }), catalog.products);
router.get('/products/facets', catalog.facets);
router.get('/products/:slug', validate({ params: slugParam }), catalog.product);
router.get(
  '/products/:slug/reviews',
  validate({ params: slugParam, query: z.object(pagination(6, 30)) }),
  catalog.productReviews,
);
router.get('/categories', catalog.categories);
router.get('/collections', catalog.collections);
router.get('/collections/:slug', validate({ params: slugParam }), catalog.collection);
router.get('/lookbooks', catalog.lookbooks);
router.get('/homepage', catalog.homepage);
router.get('/settings', catalog.settings);

export default router;
