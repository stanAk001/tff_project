import { prisma } from '../../config/prisma.js';
import { getOverview } from '../../services/analytics.service.js';
import * as homepage from '../../services/homepage.service.js';
import { listInventory, setVariantStock } from '../../services/inventory.service.js';
import { deleteMedia, uploadMedia } from '../../services/media.service.js';
import { getSettings, saveSettings } from '../../services/settings.service.js';
import { created, ok, pageMeta } from '../../utils/respond.js';

// ── Overview ─────────────────────────────────────────────────────────────

export const overview = async (req, res) => ok(res, await getOverview(req.valid.query.days));

// ── Inventory ────────────────────────────────────────────────────────────

export const inventory = async (req, res) => {
  const query = req.valid.query;
  const settings = await getSettings();
  const lowStockThreshold = settings.store.lowStockThreshold;
  const { rows, total, outCount, lowCount } = await listInventory({ ...query, lowStockThreshold });

  ok(
    res,
    rows.map(({ product, _count, ...variant }) => ({
      ...variant,
      product: { id: product.id, name: product.name, slug: product.slug, status: product.status },
      imageUrl: product.images[0]?.url || null,
      waiting: _count.stockNotifications,
    })),
    { ...pageMeta(query.page, query.limit, total), outCount, lowCount, lowStockThreshold },
  );
};

export const updateStock = async (req, res) => {
  const { variant, notified } = await setVariantStock(req.valid.params.id, req.valid.body.stock);
  ok(res, { id: variant.id, stock: variant.stock, notified });
};

// ── Discounts ────────────────────────────────────────────────────────────

const discountData = (body) => ({
  code: body.code.toUpperCase(),
  type: body.type,
  value: body.value,
  minOrderAmount: body.minOrderAmount,
  usageLimit: body.usageLimit ?? null,
  expiresAt: body.expiresAt ?? null,
  active: body.active,
});

export const listDiscounts = async (_req, res) =>
  ok(res, await prisma.discount.findMany({ orderBy: { createdAt: 'desc' } }));

export const createDiscount = async (req, res) =>
  created(res, await prisma.discount.create({ data: discountData(req.valid.body) }));

export const updateDiscount = async (req, res) =>
  ok(res, await prisma.discount.update({ where: { id: req.valid.params.id }, data: discountData(req.valid.body) }));

export const deleteDiscount = async (req, res) => {
  await prisma.discount.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// ── Reviews ──────────────────────────────────────────────────────────────

export const listReviews = async (req, res) => {
  const { status, page, limit } = req.valid.query;
  const where = status ? { status } : {};
  const [rows, total, pending] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        product: { select: { name: true, slug: true } },
        customer: { select: { firstName: true, lastName: true, email: true } },
      },
    }),
    prisma.review.count({ where }),
    prisma.review.count({ where: { status: 'PENDING' } }),
  ]);
  ok(res, rows, { ...pageMeta(page, limit, total), pending });
};

export const setReviewStatus = async (req, res) =>
  ok(
    res,
    await prisma.review.update({
      where: { id: req.valid.params.id },
      data: { status: req.valid.body.status },
      select: { id: true, status: true },
    }),
  );

export const deleteReview = async (req, res) => {
  await prisma.review.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// ── Newsletter ───────────────────────────────────────────────────────────

export const listSubscribers = async (req, res) => {
  const { q, page, limit } = req.valid.query;
  const where = q ? { email: { contains: q, mode: 'insensitive' } } : {};
  const [rows, total] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.newsletterSubscriber.count({ where }),
  ]);
  ok(res, rows, pageMeta(page, limit, total));
};

export const exportSubscribers = async (_req, res) => {
  const rows = await prisma.newsletterSubscriber.findMany({ where: { active: true }, orderBy: { createdAt: 'desc' } });
  const csv = ['email,subscribed_on', ...rows.map((row) => `${row.email},${row.createdAt.toISOString().slice(0, 10)}`)];
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="tff-subscribers.csv"');
  res.send(csv.join('\n'));
};

export const deleteSubscriber = async (req, res) => {
  await prisma.newsletterSubscriber.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// ── Homepage ─────────────────────────────────────────────────────────────

export const listSections = async (_req, res) => ok(res, await homepage.listAdminSections());

export const updateSection = async (req, res) =>
  ok(res, await homepage.updateSection(req.valid.params.id, req.valid.body));

export const reorderSections = async (req, res) => ok(res, await homepage.reorderSections(req.valid.body.ids));

// ── Settings ─────────────────────────────────────────────────────────────

export const getStoreSettings = async (_req, res) => ok(res, await getSettings());

export const updateStoreSettings = async (req, res) => ok(res, await saveSettings(req.valid.body));

// ── Media ────────────────────────────────────────────────────────────────

export const upload = async (req, res) => created(res, await uploadMedia(req.file));

export const removeMedia = async (req, res) => {
  await deleteMedia(req.valid.body.publicId, req.valid.body.type);
  ok(res);
};
