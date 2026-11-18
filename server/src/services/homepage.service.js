import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { cardInclude, toCard } from './product.service.js';

export const lookItemInclude = {
  products: {
    orderBy: { position: 'asc' },
    where: { product: { status: 'PUBLISHED' } },
    include: { product: { include: cardInclude } },
  },
};

export const serializeLookItem = (item) => ({
  id: item.id,
  mediaUrl: item.mediaUrl,
  mediaType: item.mediaType,
  posterUrl: item.posterUrl,
  caption: item.caption,
  layout: item.layout,
  products: item.products.map((link) => ({ x: link.x, y: link.y, product: toCard(link.product) })),
});

const collectionCard = {
  id: true,
  name: true,
  slug: true,
  description: true,
  coverImageUrl: true,
  coverVideoUrl: true,
  launchDate: true,
  status: true,
  isDrop: true,
  dropNumber: true,
};

// Everything the homepage needs, in one request.
export const getHomepage = async () => {
  const sections = await prisma.homepageSection.findMany({
    where: { enabled: true },
    orderBy: { position: 'asc' },
    include: {
      products: {
        orderBy: { position: 'asc' },
        where: { product: { status: 'PUBLISHED' } },
        include: { product: { include: cardInclude } },
      },
      collections: {
        orderBy: { position: 'asc' },
        where: { collection: { published: true } },
        include: { collection: { select: collectionCard } },
      },
    },
  });

  return Promise.all(
    sections.map(async (section) => {
      const base = {
        id: section.id,
        type: section.type,
        content: section.content,
        products: section.products.map((link) => toCard(link.product)),
        collections: section.collections.map((link) => link.collection),
      };

      // The brand statement backs its words with live facts: the whole published range
      // ("fewer pieces") and the real stock left in the current drop ("limited runs").
      if (section.type === 'MANIFESTO') {
        const [range, drop] = await Promise.all([
          prisma.product.findMany({
            where: { status: 'PUBLISHED' },
            orderBy: [{ featured: 'desc' }, { publishedAt: 'desc' }],
            select: { id: true, name: true, slug: true, images: { orderBy: { position: 'asc' }, take: 1, select: { url: true } } },
          }),
          prisma.collection.findFirst({
            where: { published: true, isDrop: true, status: 'ACTIVE' },
            orderBy: [{ dropNumber: 'desc' }, { createdAt: 'desc' }],
            select: { name: true, slug: true, dropNumber: true, products: { where: { product: { status: 'PUBLISHED' } }, select: { productId: true } } },
          }),
        ]);
        let left = null;
        if (drop?.products.length) {
          const stock = await prisma.productVariant.aggregate({
            where: { productId: { in: drop.products.map((link) => link.productId) } },
            _sum: { stock: true },
          });
          left = stock._sum.stock ?? 0;
        }
        base.proof = {
          pieces: range.map((product) => ({ id: product.id, name: product.name, slug: product.slug, imageUrl: product.images[0]?.url || null })),
          drop: drop ? { name: drop.name, slug: drop.slug, dropNumber: drop.dropNumber, pieces: drop.products.length, left } : null,
        };
      }

      if (section.type === 'CATEGORIES') {
        base.categories = await prisma.category.findMany({
          orderBy: { position: 'asc' },
          select: { id: true, name: true, slug: true, imageUrl: true, videoUrl: true },
        });
      }

      if (section.type === 'SHOP_THE_LOOK' && section.content.lookItemId) {
        const item = await prisma.lookbookItem.findUnique({
          where: { id: section.content.lookItemId },
          include: lookItemInclude,
        });
        base.look = item ? serializeLookItem(item) : null;
      }

      if (section.type === 'LOOKBOOK') {
        const lookbook = await prisma.lookbook.findFirst({
          where: { published: true },
          orderBy: [{ position: 'asc' }, { createdAt: 'desc' }],
          include: { items: { orderBy: { position: 'asc' }, take: 3 } },
        });
        base.lookbook = lookbook
          ? {
              title: lookbook.title,
              slug: lookbook.slug,
              season: lookbook.season,
              items: lookbook.items.map(({ id, mediaUrl, mediaType, posterUrl, caption }) => ({
                id,
                mediaUrl,
                mediaType,
                posterUrl,
                caption,
              })),
            }
          : null;
      }

      return base;
    }),
  );
};

export const listAdminSections = async () => {
  const sections = await prisma.homepageSection.findMany({
    orderBy: { position: 'asc' },
    include: {
      products: { orderBy: { position: 'asc' }, select: { productId: true } },
      collections: { orderBy: { position: 'asc' }, select: { collectionId: true } },
    },
  });
  return sections.map(({ products, collections, ...section }) => ({
    ...section,
    productIds: products.map((link) => link.productId),
    collectionIds: collections.map((link) => link.collectionId),
  }));
};

export const updateSection = async (id, { enabled, content, productIds, collectionIds }) => {
  const section = await prisma.homepageSection.findUnique({ where: { id } });
  if (!section) throw ApiError.notFound('That homepage section no longer exists.');

  await prisma.$transaction([
    prisma.homepageSection.update({ where: { id }, data: { enabled, content } }),
    prisma.homepageProduct.deleteMany({ where: { sectionId: id } }),
    prisma.homepageProduct.createMany({
      data: productIds.map((productId, position) => ({ sectionId: id, productId, position })),
    }),
    prisma.homepageCollection.deleteMany({ where: { sectionId: id } }),
    prisma.homepageCollection.createMany({
      data: collectionIds.map((collectionId, position) => ({ sectionId: id, collectionId, position })),
    }),
  ]);
  return listAdminSections();
};

export const reorderSections = async (ids) => {
  await prisma.$transaction(
    ids.map((id, position) => prisma.homepageSection.update({ where: { id }, data: { position } })),
  );
  return listAdminSections();
};
