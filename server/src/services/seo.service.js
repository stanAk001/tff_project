import { env } from '../config/env.js';
import { prisma } from '../config/prisma.js';

const escapeXml = (value) =>
  String(value).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]);

const escapeAttr = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export const buildSitemap = async () => {
  const [products, collections, categories] = await Promise.all([
    prisma.product.findMany({ where: { status: 'PUBLISHED' }, select: { slug: true, updatedAt: true } }),
    prisma.collection.findMany({ where: { published: true }, select: { slug: true, updatedAt: true } }),
    prisma.category.findMany({ select: { slug: true, updatedAt: true } }),
  ]);

  const urls = [
    { path: '/', priority: '1.0' },
    { path: '/shop', priority: '0.9' },
    { path: '/collections', priority: '0.8' },
    { path: '/lookbook', priority: '0.7' },
    ...categories.map((c) => ({ path: `/shop?category=${c.slug}`, lastmod: c.updatedAt, priority: '0.7' })),
    ...collections.map((c) => ({ path: `/collections/${c.slug}`, lastmod: c.updatedAt, priority: '0.8' })),
    ...products.map((p) => ({ path: `/products/${p.slug}`, lastmod: p.updatedAt, priority: '0.9' })),
  ];

  const body = urls
    .map(
      ({ path, lastmod, priority }) =>
        `  <url><loc>${escapeXml(env.clientUrl + path)}</loc>${
          lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''
        }<priority>${priority}</priority></url>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
};

export const buildRobots = () =>
  [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /orders',
    'Disallow: /api',
    '',
    `Sitemap: ${env.clientUrl}/sitemap.xml`,
    '',
  ].join('\n');

// Looks up title/description/image for the URLs that get shared and crawled most.
const metaForPath = async (path) => {
  const product = path.match(/^\/products\/([a-z0-9-]+)\/?$/);
  if (product) {
    const row = await prisma.product.findFirst({
      where: { slug: product[1], status: 'PUBLISHED' },
      select: { name: true, description: true, seoTitle: true, seoDescription: true, images: { take: 1, orderBy: { position: 'asc' } } },
    });
    if (!row) return null;
    return {
      title: row.seoTitle || `${row.name} — TFF`,
      description: row.seoDescription || row.description.slice(0, 160),
      image: row.images[0]?.url,
      type: 'product',
    };
  }

  const collection = path.match(/^\/collections\/([a-z0-9-]+)\/?$/);
  if (collection) {
    const row = await prisma.collection.findFirst({ where: { slug: collection[1], published: true } });
    if (!row) return null;
    return {
      title: row.seoTitle || `${row.name} — TFF`,
      description: row.seoDescription || row.description?.slice(0, 160) || '',
      image: row.coverImageUrl,
      type: 'website',
    };
  }
  return null;
};

// In production the API serves the built storefront. Product and collection pages get
// their own title and social-sharing tags written into the HTML before it is sent,
// so link previews and crawlers that don't run JavaScript still see the right thing.
export const injectMeta = async (html, path) => {
  const meta = await metaForPath(path).catch(() => null);
  if (!meta) return html;

  const tags = [
    `<title>${escapeAttr(meta.title)}</title>`,
    `<meta name="description" content="${escapeAttr(meta.description)}">`,
    `<link rel="canonical" href="${escapeAttr(env.clientUrl + path)}">`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}">`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:url" content="${escapeAttr(env.clientUrl + path)}">`,
    meta.image ? `<meta property="og:image" content="${escapeAttr(meta.image)}">` : '',
  ].join('\n    ');

  return html
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/<meta name="description"[^>]*>/, '')
    .replace('</head>', `    ${tags}\n  </head>`);
};
