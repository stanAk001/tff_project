import { prisma } from '../../config/prisma.js';
import * as products from '../../services/product.service.js';
import { ApiError } from '../../utils/ApiError.js';
import { created, ok, pageMeta } from '../../utils/respond.js';

export const list = async (req, res) => {
  const query = req.valid.query;
  const { products: rows, total } = await products.listAdminProducts(query);
  ok(res, rows, pageMeta(query.page, query.limit, total));
};

// A light list for pickers (homepage, collections, lookbook hotspots).
export const options = async (_req, res) => {
  const rows = await prisma.product.findMany({
    where: { status: { not: 'ARCHIVED' } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      price: true,
      status: true,
      images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } },
    },
  });
  ok(res, rows.map(({ images, ...row }) => ({ ...row, imageUrl: images[0]?.url || null })));
};

const present = ({ collections, ...product }) => ({
  ...product,
  collectionIds: collections.map((entry) => entry.collectionId),
});

export const get = async (req, res) => {
  const product = await prisma.product.findUnique({
    where: { id: req.valid.params.id },
    include: products.adminInclude,
  });
  if (!product) throw ApiError.notFound('That product no longer exists.');
  ok(res, present(product));
};

export const create = async (req, res) => created(res, present(await products.createProduct(req.valid.body)));

export const update = async (req, res) =>
  ok(res, present(await products.updateProduct(req.valid.params.id, req.valid.body)));

// Publish, unpublish or archive without opening the full editor.
export const setStatus = async (req, res) => {
  const { status } = req.valid.body;
  const existing = await prisma.product.findUnique({ where: { id: req.valid.params.id } });
  if (!existing) throw ApiError.notFound('That product no longer exists.');

  const product = await prisma.product.update({
    where: { id: existing.id },
    data: { status, publishedAt: status === 'PUBLISHED' ? existing.publishedAt || new Date() : existing.publishedAt },
    select: { id: true, status: true },
  });
  ok(res, product);
};

export const remove = async (req, res) => {
  await prisma.product.delete({ where: { id: req.valid.params.id } });
  ok(res);
};
