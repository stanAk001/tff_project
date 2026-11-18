import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import * as demo from './seed-data.js';
import { applyDemoMedia } from './seed-media.js';

const prisma = new PrismaClient();
const withDemo = process.env.SEED_DEMO !== 'false';

const colourCode = (colour) => colour.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase();
const sizeCode = (size) => (size === 'One Size' ? 'OS' : size);

// The site can't be managed without an admin account, so this always runs.
const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || '').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account.');
    return;
  }
  const existing = await prisma.adminUser.findUnique({ where: { email } });
  if (existing) return console.log(`Admin account already exists: ${email}`);

  await prisma.adminUser.create({
    data: { email, name: process.env.ADMIN_NAME || 'TFF Owner', passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`Created admin account: ${email}`);
};

// The homepage editor expects one row per section type. Missing ones are added
// (disabled and empty unless demo content is on); existing ones are never touched.
const seedHomepageSections = async (productIdBySku, collectionIdBySlug, lookItemId) => {
  for (const [position, section] of demo.homepageSections.entries()) {
    const exists = await prisma.homepageSection.findUnique({ where: { type: section.type } });
    if (exists) continue;

    const content = { ...section.content };
    if (section.type === 'SHOP_THE_LOOK' && lookItemId) content.lookItemId = lookItemId;

    await prisma.homepageSection.create({
      data: {
        type: section.type,
        position,
        enabled: withDemo || ['HERO', 'CATEGORIES', 'NEWSLETTER'].includes(section.type),
        content: withDemo ? content : {},
        products: {
          create: (section.products || [])
            .filter((sku) => productIdBySku.has(sku))
            .map((sku, index) => ({ productId: productIdBySku.get(sku), position: index })),
        },
        collections: {
          create: (section.collections || [])
            .filter((slug) => collectionIdBySlug.has(slug))
            .map((slug, index) => ({ collectionId: collectionIdBySlug.get(slug), position: index })),
        },
      },
    });
  }
};

const seedDemoCatalogue = async () => {
  const productIdBySku = new Map();
  const collectionIdBySlug = new Map();

  const categoryIdBySlug = new Map();
  for (const [position, category] of demo.categories.entries()) {
    const row = await prisma.category.upsert({
      where: { slug: category.slug },
      create: { ...category, sizeGuide: category.sizeGuide ?? undefined, position },
      update: {},
    });
    categoryIdBySlug.set(category.slug, row.id);
  }

  for (const [index, product] of demo.products.entries()) {
    const variants = Object.entries(product.colours).flatMap(([colour, stock]) =>
      product.sizes.map((size, sizeIndex) => ({
        colour,
        colourHex: demo.COLOURS[colour],
        size,
        sku: `${product.sku}-${colourCode(colour)}-${sizeCode(size)}`,
        stock: Array.isArray(stock) ? stock[sizeIndex] ?? 0 : stock,
      })),
    );

    const row = await prisma.product.create({
      data: {
        name: product.name,
        slug: product.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        sku: product.sku,
        description: product.description,
        price: product.price,
        compareAtPrice: product.compareAtPrice ?? null,
        categoryId: categoryIdBySlug.get(product.category),
        gender: product.gender,
        tags: product.tags,
        status: 'PUBLISHED',
        featured: Boolean(product.featured),
        isNew: Boolean(product.isNew),
        bestseller: Boolean(product.bestseller),
        limited: Boolean(product.limited),
        salesCount: product.salesCount ?? 0,
        // Stagger publish dates so "Newest" sorting has something to show
        publishedAt: new Date(Date.now() - (product.isNew ? index : 30 + index) * 24 * 60 * 60 * 1000),
        variants: { create: variants },
      },
    });
    productIdBySku.set(product.sku, row.id);
  }

  for (const { products, ...collection } of demo.collections) {
    const row = await prisma.collection.create({
      data: {
        ...collection,
        products: {
          create: products.map((sku, position) => ({ productId: productIdBySku.get(sku), position })),
        },
      },
    });
    collectionIdBySlug.set(collection.slug, row.id);
  }

  const { items, ...lookbook } = demo.lookbook;
  const createdLookbook = await prisma.lookbook.create({
    data: {
      ...lookbook,
      published: true,
      items: {
        create: items.map((item, position) => ({
          layout: item.layout,
          caption: item.caption,
          position,
          products: {
            create: item.products.map(([sku, x, y], index) => ({
              productId: productIdBySku.get(sku),
              x,
              y,
              position: index,
            })),
          },
        })),
      },
    },
    include: { items: { orderBy: { position: 'asc' } } },
  });

  for (const discount of demo.discounts) {
    await prisma.discount.upsert({ where: { code: discount.code }, create: discount, update: {} });
  }

  console.log(
    `Added demo content: ${demo.products.length} products, ${demo.collections.length} collections, 1 lookbook, ${demo.discounts.length} discount codes.`,
  );
  return { productIdBySku, collectionIdBySlug, lookItemId: createdLookbook.items[0]?.id };
};

const main = async () => {
  await seedAdmin();

  let refs = { productIdBySku: new Map(), collectionIdBySlug: new Map(), lookItemId: null };
  const hasProducts = (await prisma.product.count()) > 0;
  if (withDemo && !hasProducts) {
    refs = await seedDemoCatalogue();
  } else if (withDemo) {
    console.log('Products already exist — demo content was not added again.');
  }

  await seedHomepageSections(refs.productIdBySku, refs.collectionIdBySlug, refs.lookItemId);
  if (withDemo) console.log('Demo photography and film:', await applyDemoMedia(prisma));
  console.log('Seed complete.');
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
