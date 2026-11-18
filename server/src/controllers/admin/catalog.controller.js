import { prisma } from '../../config/prisma.js';
import { ApiError } from '../../utils/ApiError.js';
import { created, ok } from '../../utils/respond.js';
import { uniqueSlug } from '../../utils/slug.js';

const nullable = (value) => (value === '' || value === undefined ? null : value);

// ── Categories ───────────────────────────────────────────────────────────

const categoryData = (body) => ({
  name: body.name,
  description: nullable(body.description),
  imageUrl: nullable(body.imageUrl),
  videoUrl: nullable(body.videoUrl),
  sizeGuide: body.sizeGuide ?? undefined,
  seoTitle: nullable(body.seoTitle),
  seoDescription: nullable(body.seoDescription),
});

export const listCategories = async (_req, res) => {
  const rows = await prisma.category.findMany({
    orderBy: { position: 'asc' },
    include: { _count: { select: { products: true } } },
  });
  ok(res, rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products })));
};

export const createCategory = async (req, res) => {
  const body = req.valid.body;
  const position = await prisma.category.count();
  const category = await prisma.category.create({
    data: { ...categoryData(body), slug: await uniqueSlug(prisma.category, body.slug || body.name), position },
  });
  created(res, category);
};

export const updateCategory = async (req, res) => {
  const { id } = req.valid.params;
  const body = req.valid.body;
  const category = await prisma.category.update({
    where: { id },
    data: { ...categoryData(body), slug: await uniqueSlug(prisma.category, body.slug || body.name, id) },
  });
  ok(res, category);
};

export const reorderCategories = async (req, res) => {
  await prisma.$transaction(
    req.valid.body.ids.map((id, position) => prisma.category.update({ where: { id }, data: { position } })),
  );
  ok(res);
};

export const deleteCategory = async (req, res) => {
  // Products in the category are kept; they simply become uncategorised.
  await prisma.category.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// ── Collections & drops ──────────────────────────────────────────────────

const collectionData = (body) => ({
  name: body.name,
  description: nullable(body.description),
  coverImageUrl: nullable(body.coverImageUrl),
  coverVideoUrl: nullable(body.coverVideoUrl),
  launchDate: body.launchDate ?? null,
  status: body.status,
  isDrop: body.isDrop,
  dropNumber: body.isDrop ? body.dropNumber ?? null : null,
  featured: body.featured,
  published: body.published,
  seoTitle: nullable(body.seoTitle),
  seoDescription: nullable(body.seoDescription),
});

const collectionInclude = { products: { orderBy: { position: 'asc' }, select: { productId: true } } };
const presentCollection = ({ products, ...collection }) => ({
  ...collection,
  productIds: products.map((link) => link.productId),
});

export const listCollections = async (_req, res) => {
  const rows = await prisma.collection.findMany({
    orderBy: [{ createdAt: 'desc' }],
    include: { _count: { select: { products: true } } },
  });
  ok(res, rows.map(({ _count, ...row }) => ({ ...row, productCount: _count.products })));
};

export const getCollection = async (req, res) => {
  const row = await prisma.collection.findUnique({ where: { id: req.valid.params.id }, include: collectionInclude });
  if (!row) throw ApiError.notFound('That collection no longer exists.');
  ok(res, presentCollection(row));
};

export const createCollection = async (req, res) => {
  const body = req.valid.body;
  const row = await prisma.collection.create({
    data: {
      ...collectionData(body),
      slug: await uniqueSlug(prisma.collection, body.slug || body.name),
      products: { create: body.productIds.map((productId, position) => ({ productId, position })) },
    },
    include: collectionInclude,
  });
  created(res, presentCollection(row));
};

export const updateCollection = async (req, res) => {
  const { id } = req.valid.params;
  const body = req.valid.body;
  const slug = await uniqueSlug(prisma.collection, body.slug || body.name, id);

  await prisma.$transaction([
    prisma.collection.update({ where: { id }, data: { ...collectionData(body), slug } }),
    prisma.collectionProduct.deleteMany({ where: { collectionId: id } }),
    prisma.collectionProduct.createMany({
      data: body.productIds.map((productId, position) => ({ collectionId: id, productId, position })),
    }),
  ]);
  const row = await prisma.collection.findUnique({ where: { id }, include: collectionInclude });
  ok(res, presentCollection(row));
};

export const deleteCollection = async (req, res) => {
  await prisma.collection.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// ── Lookbooks ────────────────────────────────────────────────────────────

const lookbookInclude = {
  items: {
    orderBy: { position: 'asc' },
    include: { products: { orderBy: { position: 'asc' }, select: { productId: true, x: true, y: true } } },
  },
};

export const listLookbooks = async (_req, res) => {
  const rows = await prisma.lookbook.findMany({
    orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
    include: { items: { orderBy: { position: 'asc' }, select: { id: true, mediaUrl: true, mediaType: true, posterUrl: true, caption: true } } },
  });
  ok(res, rows);
};

export const getLookbook = async (req, res) => {
  const row = await prisma.lookbook.findUnique({ where: { id: req.valid.params.id }, include: lookbookInclude });
  if (!row) throw ApiError.notFound('That lookbook no longer exists.');
  ok(res, row);
};

const lookbookData = (body) => ({
  title: body.title,
  season: nullable(body.season),
  description: nullable(body.description),
  published: body.published,
});

const itemData = (item, position) => ({
  mediaUrl: nullable(item.mediaUrl),
  mediaType: item.mediaType,
  posterUrl: nullable(item.posterUrl),
  caption: nullable(item.caption),
  layout: item.layout,
  position,
});

const productLinks = (item) =>
  item.products.map((link, position) => ({ productId: link.productId, x: link.x ?? null, y: link.y ?? null, position }));

export const createLookbook = async (req, res) => {
  const body = req.valid.body;
  const row = await prisma.lookbook.create({
    data: {
      ...lookbookData(body),
      slug: await uniqueSlug(prisma.lookbook, body.slug || body.title),
      items: {
        create: body.items.map((item, position) => ({
          ...itemData(item, position),
          products: { create: productLinks(item) },
        })),
      },
    },
    include: lookbookInclude,
  });
  created(res, row);
};

export const updateLookbook = async (req, res) => {
  const { id } = req.valid.params;
  const body = req.valid.body;
  const existing = await prisma.lookbook.findUnique({ where: { id }, include: { items: { select: { id: true } } } });
  if (!existing) throw ApiError.notFound('That lookbook no longer exists.');

  const slug = await uniqueSlug(prisma.lookbook, body.slug || body.title, id);
  const existingIds = new Set(existing.items.map((item) => item.id));
  const keptIds = body.items.map((item) => item.id).filter((itemId) => itemId && existingIds.has(itemId));

  // Images keep their ids when edited, so a homepage "Shop the Look" pointing at one keeps working
  await prisma.$transaction(async (tx) => {
    await tx.lookbook.update({ where: { id }, data: { ...lookbookData(body), slug } });
    await tx.lookbookItem.deleteMany({ where: { lookbookId: id, id: { notIn: keptIds } } });

    for (const [position, item] of body.items.entries()) {
      if (item.id && existingIds.has(item.id)) {
        await tx.lookbookItem.update({ where: { id: item.id }, data: itemData(item, position) });
        await tx.lookbookProduct.deleteMany({ where: { itemId: item.id } });
        await tx.lookbookProduct.createMany({
          data: productLinks(item).map((link) => ({ ...link, itemId: item.id })),
        });
      } else {
        await tx.lookbookItem.create({
          data: { ...itemData(item, position), lookbookId: id, products: { create: productLinks(item) } },
        });
      }
    }
  });

  ok(res, await prisma.lookbook.findUnique({ where: { id }, include: lookbookInclude }));
};

export const deleteLookbook = async (req, res) => {
  await prisma.lookbook.delete({ where: { id: req.valid.params.id } });
  ok(res);
};

// Every lookbook image, for choosing the homepage "Shop the Look".
export const listLooks = async (_req, res) => {
  const rows = await prisma.lookbookItem.findMany({
    where: { mediaType: 'IMAGE' },
    orderBy: [{ lookbook: { position: 'asc' } }, { position: 'asc' }],
    select: {
      id: true,
      mediaUrl: true,
      caption: true,
      lookbook: { select: { title: true } },
      _count: { select: { products: true } },
    },
  });
  ok(res, rows.map(({ _count, lookbook, ...row }) => ({ ...row, lookbook: lookbook.title, productCount: _count.products })));
};
