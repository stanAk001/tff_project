import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { uniqueSlug } from '../utils/slug.js';
import { notifyRestocked } from './inventory.service.js';

// ── Shapes ───────────────────────────────────────────────────────────────

export const cardInclude = {
  // Enough photos for the hover angle and a picture of each colourway
  images: { orderBy: { position: 'asc' }, take: 6, select: { url: true, alt: true, colour: true, width: true, height: true } },
  variants: { select: { id: true, colour: true, colourHex: true, size: true, stock: true } },
  category: { select: { name: true, slug: true } },
};

const SIZE_ORDER = ['XXS', 'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'];
export const sortSizes = (sizes) =>
  [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, undefined, { numeric: true });
  });

const coloursOf = (variants) => {
  const seen = new Map();
  for (const variant of variants) {
    if (!seen.has(variant.colour)) seen.set(variant.colour, { name: variant.colour, hex: variant.colourHex });
  }
  return [...seen.values()];
};

// The compact product shape used by every grid, carousel and search result.
export const toCard = (product) => {
  const totalStock = product.variants.reduce((sum, variant) => sum + variant.stock, 0);
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images,
    colours: coloursOf(product.variants),
    sizes: sortSizes([...new Set(product.variants.map((variant) => variant.size))]),
    variants: product.variants,
    category: product.category,
    isNew: product.isNew,
    limited: product.limited,
    bestseller: product.bestseller,
    soldOut: totalStock === 0,
    status: product.status,
  };
};

// ── Storefront queries ───────────────────────────────────────────────────

const SORTS = {
  featured: [{ featured: 'desc' }, { publishedAt: 'desc' }],
  newest: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  popular: [{ salesCount: 'desc' }, { publishedAt: 'desc' }],
};

const searchClause = (q) => ({
  OR: [
    { name: { contains: q, mode: 'insensitive' } },
    { description: { contains: q, mode: 'insensitive' } },
    { sku: { contains: q, mode: 'insensitive' } },
    { tags: { has: q.toLowerCase() } },
    { category: { name: { contains: q, mode: 'insensitive' } } },
    { collections: { some: { collection: { name: { contains: q, mode: 'insensitive' } } } } },
    { variants: { some: { sku: { contains: q, mode: 'insensitive' } } } },
  ],
});

export const buildProductWhere = (filters) => {
  const and = [{ status: 'PUBLISHED' }];

  if (filters.q) and.push(searchClause(filters.q));
  if (filters.category) and.push({ category: { slug: filters.category } });
  if (filters.collection) and.push({ collections: { some: { collection: { slug: filters.collection } } } });
  // Unisex pieces belong in both the men's and women's edits
  if (filters.gender) and.push({ gender: { in: [filters.gender, 'UNISEX'] } });
  if (filters.minPrice != null) and.push({ price: { gte: filters.minPrice } });
  if (filters.maxPrice != null) and.push({ price: { lte: filters.maxPrice } });
  if (filters.featured) and.push({ featured: true });
  if (filters.isNew) and.push({ isNew: true });

  // Size, colour and "in stock" must be satisfied by the same variant
  const variant = {};
  if (filters.sizes?.length) variant.size = { in: filters.sizes };
  if (filters.colours?.length) variant.colour = { in: filters.colours, mode: 'insensitive' };
  if (filters.availability === 'in_stock') variant.stock = { gt: 0 };
  if (Object.keys(variant).length) and.push({ variants: { some: variant } });
  if (filters.availability === 'sold_out') and.push({ variants: { none: { stock: { gt: 0 } } } });

  return { AND: and };
};

export const listProducts = async (filters) => {
  const { page, limit, sort } = filters;
  const where = buildProductWhere(filters);
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: cardInclude,
      orderBy: SORTS[sort] || SORTS.featured,
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return { products: products.map(toCard), total };
};

// Everything the filter panel can offer, taken from what is actually published.
export const getFacets = async () => {
  const published = { product: { status: 'PUBLISHED' } };
  const [sizes, colours, price, categories, collections] = await Promise.all([
    prisma.productVariant.findMany({ where: published, distinct: ['size'], select: { size: true } }),
    prisma.productVariant.findMany({
      where: published,
      distinct: ['colour'],
      select: { colour: true, colourHex: true },
      orderBy: { colour: 'asc' },
    }),
    prisma.product.aggregate({ where: { status: 'PUBLISHED' }, _min: { price: true }, _max: { price: true } }),
    prisma.category.findMany({
      where: { products: { some: { status: 'PUBLISHED' } } },
      select: { name: true, slug: true },
      orderBy: { position: 'asc' },
    }),
    prisma.collection.findMany({
      where: { published: true, status: 'ACTIVE', products: { some: { product: { status: 'PUBLISHED' } } } },
      select: { name: true, slug: true },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return {
    sizes: sortSizes(sizes.map((row) => row.size)),
    colours: colours.map((row) => ({ name: row.colour, hex: row.colourHex })),
    price: { min: price._min.price ?? 0, max: price._max.price ?? 0 },
    categories,
    collections,
  };
};

export const getProductBySlug = async (slug) => {
  const product = await prisma.product.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: {
      images: { orderBy: { position: 'asc' } },
      videos: { orderBy: { position: 'asc' } },
      variants: { select: { id: true, colour: true, colourHex: true, size: true, stock: true, sku: true } },
      category: { select: { id: true, name: true, slug: true, sizeGuide: true } },
      collections: {
        where: { collection: { published: true } },
        select: { collection: { select: { name: true, slug: true, status: true } } },
      },
    },
  });
  if (!product) throw ApiError.notFound('We couldn’t find that piece.');

  const [rating, related, look] = await Promise.all([
    prisma.review.aggregate({
      where: { productId: product.id, status: 'APPROVED' },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.product.findMany({
      where: {
        status: 'PUBLISHED',
        id: { not: product.id },
        ...(product.categoryId ? { categoryId: product.categoryId } : {}),
      },
      include: cardInclude,
      orderBy: { salesCount: 'desc' },
      take: 4,
    }),
    // "Complete the look": the first published lookbook image this piece is styled in
    prisma.lookbookItem.findFirst({
      where: {
        mediaType: 'IMAGE',
        mediaUrl: { not: null },
        lookbook: { published: true },
        products: { some: { productId: product.id } },
      },
      orderBy: [{ lookbook: { position: 'asc' } }, { position: 'asc' }],
      include: {
        products: {
          orderBy: { position: 'asc' },
          where: { product: { status: 'PUBLISHED' } },
          include: { product: { include: cardInclude } },
        },
      },
    }),
  ]);

  const otherPieces = look ? look.products.filter((link) => link.productId !== product.id) : [];

  return {
    ...product,
    collections: product.collections.map((entry) => entry.collection),
    colours: coloursOf(product.variants),
    sizes: sortSizes([...new Set(product.variants.map((variant) => variant.size))]),
    soldOut: product.variants.every((variant) => variant.stock === 0),
    rating: { average: rating._avg.rating ? Number(rating._avg.rating.toFixed(1)) : null, count: rating._count },
    related: related.map(toCard),
    completeTheLook: otherPieces.length
      ? {
          id: look.id,
          mediaUrl: look.mediaUrl,
          mediaType: look.mediaType,
          posterUrl: look.posterUrl,
          caption: look.caption,
          layout: look.layout,
          // Every piece in the frame, with marker positions, so the image stays shoppable
          products: look.products.map((link) => ({ x: link.x, y: link.y, product: toCard(link.product) })),
        }
      : null,
  };
};

// ── Admin ────────────────────────────────────────────────────────────────

export const adminInclude = {
  images: { orderBy: { position: 'asc' } },
  videos: { orderBy: { position: 'asc' } },
  variants: { orderBy: [{ colour: 'asc' }, { size: 'asc' }] },
  category: { select: { id: true, name: true } },
  collections: { select: { collectionId: true } },
};

const blankToNull = (value) => (value === '' || value === undefined ? null : value);

const baseData = (input) => ({
  name: input.name,
  description: input.description,
  price: input.price,
  compareAtPrice: input.compareAtPrice || null,
  sku: blankToNull(input.sku),
  categoryId: blankToNull(input.categoryId),
  gender: input.gender,
  tags: input.tags.map((tag) => tag.toLowerCase()),
  status: input.status,
  featured: input.featured,
  isNew: input.isNew,
  bestseller: input.bestseller,
  limited: input.limited,
  seoTitle: blankToNull(input.seoTitle),
  seoDescription: blankToNull(input.seoDescription),
});

const imageRows = (images) =>
  images.map((image, position) => ({
    url: image.url,
    publicId: image.publicId || null,
    alt: image.alt || null,
    colour: image.colour || null,
    width: image.width || null,
    height: image.height || null,
    position,
  }));

const videoRows = (videos) =>
  videos.map((video, position) => ({
    url: video.url,
    publicId: video.publicId || null,
    posterUrl: video.posterUrl || null,
    position,
  }));

const assertUniqueVariants = (variants) => {
  const keys = new Set();
  for (const variant of variants) {
    const key = `${variant.colour.toLowerCase()}|${variant.size.toLowerCase()}`;
    if (keys.has(key)) throw ApiError.badRequest(`${variant.colour} / ${variant.size} is listed twice.`);
    keys.add(key);
  }
};

export const createProduct = async (input) => {
  assertUniqueVariants(input.variants);
  const slug = await uniqueSlug(prisma.product, input.slug || input.name);

  return prisma.product.create({
    data: {
      ...baseData(input),
      slug,
      publishedAt: input.status === 'PUBLISHED' ? new Date() : null,
      images: { create: imageRows(input.images) },
      videos: { create: videoRows(input.videos) },
      variants: {
        create: input.variants.map((variant) => ({
          colour: variant.colour,
          colourHex: variant.colourHex,
          size: variant.size,
          sku: blankToNull(variant.sku),
          stock: variant.stock,
        })),
      },
      collections: { create: input.collectionIds.map((collectionId) => ({ collectionId })) },
    },
    include: adminInclude,
  });
};

export const updateProduct = async (id, input) => {
  assertUniqueVariants(input.variants);
  const existing = await prisma.product.findUnique({
    where: { id },
    include: { variants: true, collections: true },
  });
  if (!existing) throw ApiError.notFound('That product no longer exists.');

  const slug = await uniqueSlug(prisma.product, input.slug || input.name, id);
  const keyOf = (variant) => `${variant.colour.toLowerCase()}|${variant.size.toLowerCase()}`;
  const existingByKey = new Map(existing.variants.map((variant) => [keyOf(variant), variant]));
  const incomingKeys = new Set(input.variants.map(keyOf));

  // Variants are matched by colour + size so their ids (used by carts and orders) survive edits
  const removedIds = existing.variants.filter((variant) => !incomingKeys.has(keyOf(variant))).map((v) => v.id);
  const restockedIds = [];
  const variantWrites = input.variants.map((variant) => {
    const current = existingByKey.get(keyOf(variant));
    const data = {
      colour: variant.colour,
      colourHex: variant.colourHex,
      size: variant.size,
      sku: blankToNull(variant.sku),
      stock: variant.stock,
    };
    if (!current) return prisma.productVariant.create({ data: { ...data, productId: id } });
    if (current.stock === 0 && variant.stock > 0) restockedIds.push(current.id);
    return prisma.productVariant.update({ where: { id: current.id }, data });
  });

  const currentCollectionIds = existing.collections.map((entry) => entry.collectionId);
  const addedCollections = input.collectionIds.filter((cid) => !currentCollectionIds.includes(cid));

  await prisma.$transaction([
    prisma.product.update({
      where: { id },
      data: {
        ...baseData(input),
        slug,
        publishedAt: input.status === 'PUBLISHED' ? existing.publishedAt || new Date() : existing.publishedAt,
      },
    }),
    prisma.productImage.deleteMany({ where: { productId: id } }),
    prisma.productImage.createMany({ data: imageRows(input.images).map((row) => ({ ...row, productId: id })) }),
    prisma.productVideo.deleteMany({ where: { productId: id } }),
    prisma.productVideo.createMany({ data: videoRows(input.videos).map((row) => ({ ...row, productId: id })) }),
    // Clear SKUs first so swapping SKUs between variants doesn't trip the unique constraint
    prisma.productVariant.updateMany({ where: { productId: id }, data: { sku: null } }),
    prisma.productVariant.deleteMany({ where: { id: { in: removedIds } } }),
    ...variantWrites,
    prisma.collectionProduct.deleteMany({
      where: { productId: id, collectionId: { notIn: input.collectionIds } },
    }),
    prisma.collectionProduct.createMany({
      data: addedCollections.map((collectionId) => ({ collectionId, productId: id })),
    }),
  ]);

  await notifyRestocked(restockedIds);
  return prisma.product.findUnique({ where: { id }, include: adminInclude });
};

export const listAdminProducts = async ({ q, status, categoryId, page, limit }) => {
  const where = {
    ...(status ? { status } : { status: { not: 'ARCHIVED' } }),
    ...(categoryId ? { categoryId } : {}),
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: 'insensitive' } },
            { sku: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {}),
  };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { position: 'asc' }, take: 1 },
        variants: { select: { stock: true } },
        category: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);
  return {
    products: products.map(({ variants, ...product }) => ({
      ...product,
      variantCount: variants.length,
      totalStock: variants.reduce((sum, variant) => sum + variant.stock, 0),
    })),
    total,
  };
};
