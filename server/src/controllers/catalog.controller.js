import { prisma } from '../config/prisma.js';
import { getHomepage, lookItemInclude, serializeLookItem } from '../services/homepage.service.js';
import { cardInclude, getFacets, getProductBySlug, listProducts, toCard } from '../services/product.service.js';
import { getSettings } from '../services/settings.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ok, pageMeta } from '../utils/respond.js';

// ── Products ─────────────────────────────────────────────────────────────

export const products = async (req, res) => {
  const filters = req.valid.query;
  const { products: rows, total } = await listProducts(filters);
  ok(res, rows, pageMeta(filters.page, filters.limit, total));
};

export const facets = async (_req, res) => ok(res, await getFacets());

export const product = async (req, res) => ok(res, await getProductBySlug(req.valid.params.slug));

export const productReviews = async (req, res) => {
  const { page, limit } = req.valid.query;
  const found = await prisma.product.findFirst({
    where: { slug: req.valid.params.slug, status: 'PUBLISHED' },
    select: { id: true },
  });
  if (!found) throw ApiError.notFound('We couldn’t find that piece.');

  const where = { productId: found.id, status: 'APPROVED' };
  const [rows, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: { customer: { select: { firstName: true, lastName: true } } },
    }),
    prisma.review.count({ where }),
  ]);

  ok(
    res,
    rows.map(({ customer, customerId, status, ...review }) => ({
      ...review,
      // Show "Ada O." rather than a full name
      customerName: `${customer.firstName} ${customer.lastName.charAt(0)}.`,
    })),
    pageMeta(page, limit, total),
  );
};

// ── Categories ───────────────────────────────────────────────────────────

export const categories = async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true,
      videoUrl: true,
      seoTitle: true,
      seoDescription: true,
      _count: { select: { products: { where: { status: 'PUBLISHED' } } } },
    },
  });
  ok(res, rows.map(({ _count, ...category }) => ({ ...category, productCount: _count.products })));
};

// ── Collections & drops ──────────────────────────────────────────────────

// An upcoming collection goes live by itself the moment its launch date passes.
const liveStatus = (collection) =>
  collection.status === 'UPCOMING' && collection.launchDate && collection.launchDate <= new Date()
    ? 'ACTIVE'
    : collection.status;

export const collections = async (_req, res) => {
  const rows = await prisma.collection.findMany({
    where: { published: true },
    orderBy: [{ featured: 'desc' }, { launchDate: 'desc' }, { createdAt: 'desc' }],
    include: { _count: { select: { products: { where: { product: { status: 'PUBLISHED' } } } } } },
  });
  ok(
    res,
    rows.map(({ _count, ...collection }) => ({
      ...collection,
      status: liveStatus(collection),
      productCount: _count.products,
    })),
  );
};

export const collection = async (req, res) => {
  const row = await prisma.collection.findFirst({
    where: { slug: req.valid.params.slug, published: true },
    include: {
      products: {
        orderBy: { position: 'asc' },
        where: { product: { status: 'PUBLISHED' } },
        include: { product: { include: cardInclude } },
      },
    },
  });
  if (!row) throw ApiError.notFound('We couldn’t find that collection.');

  const status = liveStatus(row);
  const { products: links, ...rest } = row;
  ok(res, {
    ...rest,
    status,
    // Pieces stay under wraps until the drop launches
    products: status === 'UPCOMING' ? [] : links.map((link) => toCard(link.product)),
    productCount: links.length,
  });
};

// ── Lookbook, homepage, settings ─────────────────────────────────────────

export const lookbooks = async (_req, res) => {
  const rows = await prisma.lookbook.findMany({
    where: { published: true },
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: { items: { orderBy: { position: 'asc' }, include: lookItemInclude } },
  });
  ok(
    res,
    rows.map(({ items, ...lookbook }) => ({ ...lookbook, items: items.map(serializeLookItem) })),
  );
};

export const homepage = async (_req, res) => ok(res, await getHomepage());

export const settings = async (_req, res) => ok(res, await getSettings());
