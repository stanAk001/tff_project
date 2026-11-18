import { Router } from 'express';
import multer from 'multer';
import { z } from 'zod';
import * as auth from '../controllers/auth.controller.js';
import * as catalog from '../controllers/admin/catalog.controller.js';
import * as orders from '../controllers/admin/orders.controller.js';
import * as products from '../controllers/admin/products.controller.js';
import * as store from '../controllers/admin/store.controller.js';
import { requireAdmin } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { MAX_VIDEO_BYTES } from '../services/media.service.js';
import { email, idParam, mediaUrl, money, optionalText, pagination, requiredText } from '../utils/schemas.js';

// ── Schemas ──────────────────────────────────────────────────────────────

const id = z.string().min(1).max(40);
const ids = z.array(id).max(200);
const optionalDate = z.coerce.date().nullish().or(z.literal('').transform(() => null));
const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Pick a colour.');
const search = z.string().trim().max(80).optional();

const productBody = z
  .object({
    name: requiredText('Product name', 120),
    slug: optionalText(100),
    description: requiredText('Description', 5000),
    price: money.refine((value) => value > 0, 'Enter a price.'),
    compareAtPrice: money.nullish(),
    sku: optionalText(60),
    categoryId: optionalText(40),
    gender: z.enum(['MEN', 'WOMEN', 'UNISEX']),
    tags: z.array(z.string().trim().min(1).max(30)).max(20).default([]),
    status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']),
    featured: z.boolean().default(false),
    isNew: z.boolean().default(false),
    bestseller: z.boolean().default(false),
    limited: z.boolean().default(false),
    seoTitle: optionalText(120),
    seoDescription: optionalText(300),
    collectionIds: ids.default([]),
    images: z
      .array(
        z.object({
          url: z.string().url().max(600),
          publicId: optionalText(200),
          alt: optionalText(200),
          colour: optionalText(40),
          width: z.number().int().positive().nullish(),
          height: z.number().int().positive().nullish(),
        }),
      )
      .max(12, 'Use up to 12 images.')
      .default([]),
    videos: z
      .array(z.object({ url: z.string().url().max(600), publicId: optionalText(200), posterUrl: mediaUrl }))
      .max(2, 'Use up to 2 videos.')
      .default([]),
    variants: z
      .array(
        z.object({
          colour: requiredText('Colour name', 40),
          colourHex: hex,
          size: requiredText('Size', 20),
          sku: optionalText(60),
          stock: z.coerce.number().int().min(0, 'Stock can’t be negative.').max(100000),
        }),
      )
      .min(1, 'Add at least one colour and size.')
      .max(200),
  })
  .refine((body) => !body.compareAtPrice || body.compareAtPrice > body.price, {
    message: 'The original price should be higher than the selling price.',
    path: ['compareAtPrice'],
  })
  .refine((body) => body.status !== 'PUBLISHED' || body.images.length > 0, {
    message: 'Add at least one image before publishing.',
    path: ['images'],
  });

const sizeGuide = z
  .object({
    unit: z.string().trim().max(10).default('cm'),
    columns: z.array(z.string().trim().max(30)).min(2).max(8),
    rows: z.array(z.array(z.string().trim().max(30)).max(8)).max(20),
  })
  .nullish();

const categoryBody = z.object({
  name: requiredText('Category name', 60),
  slug: optionalText(100),
  description: optionalText(400),
  imageUrl: mediaUrl,
  videoUrl: mediaUrl,
  sizeGuide,
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
});

const collectionBody = z.object({
  name: requiredText('Collection name', 100),
  slug: optionalText(100),
  description: optionalText(2000),
  coverImageUrl: mediaUrl,
  coverVideoUrl: mediaUrl,
  launchDate: optionalDate,
  status: z.enum(['UPCOMING', 'ACTIVE', 'ARCHIVED']),
  isDrop: z.boolean().default(false),
  dropNumber: z.coerce.number().int().min(1).max(999).nullish(),
  featured: z.boolean().default(false),
  published: z.boolean().default(true),
  seoTitle: optionalText(120),
  seoDescription: optionalText(300),
  productIds: ids.default([]),
});

const percent = z.number().min(0).max(100);
const lookbookBody = z.object({
  title: requiredText('Title', 100),
  slug: optionalText(100),
  season: optionalText(60),
  description: optionalText(1000),
  published: z.boolean().default(false),
  items: z
    .array(
      z.object({
        id: id.optional(),
        mediaUrl,
        mediaType: z.enum(['IMAGE', 'VIDEO']).default('IMAGE'),
        posterUrl: mediaUrl,
        caption: optionalText(200),
        layout: z.enum(['FULL', 'WIDE', 'TALL', 'HALF']).default('FULL'),
        products: z.array(z.object({ productId: id, x: percent.nullish(), y: percent.nullish() })).max(8).default([]),
      }),
    )
    .max(40)
    .default([]),
});

const discountBody = z
  .object({
    code: z
      .string()
      .trim()
      .min(3, 'Codes need at least 3 characters.')
      .max(30)
      .regex(/^[A-Za-z0-9_-]+$/, 'Use letters and numbers only.'),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.coerce.number().int().min(1, 'Enter a discount value.'),
    minOrderAmount: money.default(0),
    usageLimit: z.coerce.number().int().min(1).nullish(),
    expiresAt: optionalDate,
    active: z.boolean().default(true),
  })
  .refine((body) => body.type !== 'PERCENTAGE' || body.value <= 100, {
    message: 'A percentage can’t be more than 100.',
    path: ['value'],
  });

const sectionBody = z.object({
  enabled: z.boolean(),
  content: z.record(z.string().max(40), z.union([z.string().max(2000), z.boolean(), z.null()])),
  productIds: ids.max(12).default([]),
  collectionIds: ids.max(6).default([]),
});

const settingsBody = z.object({
  store: z.object({
    announcement: z.string().trim().max(160).default(''),
    deliveryInfo: z.string().trim().max(1000).default(''),
    returnsInfo: z.string().trim().max(1000).default(''),
    contactEmail: z.string().trim().max(160).default(''),
    instagram: z.string().trim().max(160).default(''),
    lowStockThreshold: z.coerce.number().int().min(0).max(100).default(3),
  }),
  delivery: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(40),
        name: requiredText('Delivery name', 60),
        description: z.string().trim().max(120).default(''),
        price: money,
        freeAbove: money.default(0),
      }),
    )
    .min(1, 'Keep at least one delivery option.')
    .max(10),
});

const passwordBody = z.object({
  currentPassword: z.string().min(1).max(100),
  newPassword: z.string().min(10, 'Use at least 10 characters.').max(100),
});

const orderStatus = z.enum(['PENDING', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
const reviewStatus = z.enum(['PENDING', 'APPROVED', 'REJECTED']);

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_VIDEO_BYTES, files: 1 } });

// ── Routes ───────────────────────────────────────────────────────────────

const router = Router();

router.post(
  '/auth/login',
  authLimiter,
  validate({ body: z.object({ email, password: z.string().min(1).max(100) }) }),
  auth.adminLogin,
);
router.post('/auth/logout', auth.adminLogout);

// Everything below requires a signed-in admin.
router.use(requireAdmin);

router.get('/auth/me', auth.adminMe);
router.post('/auth/password', validate({ body: passwordBody }), auth.adminChangePassword);

router.get(
  '/overview',
  validate({ query: z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }) }),
  store.overview,
);

router.get(
  '/products',
  validate({
    query: z.object({
      ...pagination(20, 100),
      q: search,
      status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).optional(),
      categoryId: id.optional(),
    }),
  }),
  products.list,
);
router.get('/products/options', products.options);
router.post('/products', validate({ body: productBody }), products.create);
router.get('/products/:id', validate({ params: idParam }), products.get);
router.put('/products/:id', validate({ params: idParam, body: productBody }), products.update);
router.patch(
  '/products/:id/status',
  validate({ params: idParam, body: z.object({ status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']) }) }),
  products.setStatus,
);
router.delete('/products/:id', validate({ params: idParam }), products.remove);

router.get(
  '/inventory',
  validate({
    query: z.object({ ...pagination(50, 200), q: search, filter: z.enum(['all', 'low', 'out']).default('all') }),
  }),
  store.inventory,
);
router.patch(
  '/inventory/:id',
  validate({ params: idParam, body: z.object({ stock: z.coerce.number().int().min(0).max(100000) }) }),
  store.updateStock,
);

router.get('/categories', catalog.listCategories);
router.post('/categories', validate({ body: categoryBody }), catalog.createCategory);
router.put('/categories/order', validate({ body: z.object({ ids }) }), catalog.reorderCategories);
router.put('/categories/:id', validate({ params: idParam, body: categoryBody }), catalog.updateCategory);
router.delete('/categories/:id', validate({ params: idParam }), catalog.deleteCategory);

router.get('/collections', catalog.listCollections);
router.post('/collections', validate({ body: collectionBody }), catalog.createCollection);
router.get('/collections/:id', validate({ params: idParam }), catalog.getCollection);
router.put('/collections/:id', validate({ params: idParam, body: collectionBody }), catalog.updateCollection);
router.delete('/collections/:id', validate({ params: idParam }), catalog.deleteCollection);

router.get('/lookbooks', catalog.listLookbooks);
router.get('/looks', catalog.listLooks);
router.post('/lookbooks', validate({ body: lookbookBody }), catalog.createLookbook);
router.get('/lookbooks/:id', validate({ params: idParam }), catalog.getLookbook);
router.put('/lookbooks/:id', validate({ params: idParam, body: lookbookBody }), catalog.updateLookbook);
router.delete('/lookbooks/:id', validate({ params: idParam }), catalog.deleteLookbook);

router.get(
  '/orders',
  validate({ query: z.object({ ...pagination(20, 100), q: search, status: orderStatus.optional() }) }),
  orders.listOrders,
);
router.get('/orders/:id', validate({ params: idParam }), orders.getOrder);
router.patch(
  '/orders/:id/status',
  validate({
    params: idParam,
    body: z.object({ status: orderStatus, trackingNumber: optionalText(80), note: optionalText(300) }),
  }),
  orders.setOrderStatus,
);

router.get('/customers', validate({ query: z.object({ ...pagination(20, 100), q: search }) }), orders.listCustomers);
router.get('/customers/:id', validate({ params: idParam }), orders.getCustomer);

router.get('/discounts', store.listDiscounts);
router.post('/discounts', validate({ body: discountBody }), store.createDiscount);
router.put('/discounts/:id', validate({ params: idParam, body: discountBody }), store.updateDiscount);
router.delete('/discounts/:id', validate({ params: idParam }), store.deleteDiscount);

router.get(
  '/reviews',
  validate({ query: z.object({ ...pagination(20, 100), status: reviewStatus.optional() }) }),
  store.listReviews,
);
router.patch(
  '/reviews/:id',
  validate({ params: idParam, body: z.object({ status: reviewStatus }) }),
  store.setReviewStatus,
);
router.delete('/reviews/:id', validate({ params: idParam }), store.deleteReview);

router.get('/newsletter', validate({ query: z.object({ ...pagination(50, 200), q: search }) }), store.listSubscribers);
router.get('/newsletter/export', store.exportSubscribers);
router.delete('/newsletter/:id', validate({ params: idParam }), store.deleteSubscriber);

router.get('/homepage', store.listSections);
router.put('/homepage/order', validate({ body: z.object({ ids }) }), store.reorderSections);
router.put('/homepage/:id', validate({ params: idParam, body: sectionBody }), store.updateSection);

router.get('/settings', store.getStoreSettings);
router.put('/settings', validate({ body: settingsBody }), store.updateStoreSettings);

router.post('/media', upload.single('file'), store.upload);
router.delete(
  '/media',
  validate({ body: z.object({ publicId: z.string().min(1).max(200), type: z.enum(['IMAGE', 'VIDEO']).default('IMAGE') }) }),
  store.removeMedia,
);

export default router;
