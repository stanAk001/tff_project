// ─────────────────────────────────────────────────────────────────────────
// DEMO PHOTOGRAPHY & FILM
// Free-licence media for the demo catalogue, so the store looks finished
// before TFF's own shoot:
//   • Photos — Unsplash (unsplash.com/license): free for commercial use.
//   • Films  — Mixkit (mixkit.co/license): free for commercial use.
// Both are loaded straight from their CDNs. Everything here is ordinary content:
// replace or remove any of it in the admin.
//
// Run on an existing database with:  npm run db:seed-media
// It only fills spaces that are still empty — media you have uploaded is never touched.
// ─────────────────────────────────────────────────────────────────────────

const photo = (id) => `https://images.unsplash.com/${id}`;
const film = (id) => ({
  url: `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`,
  poster: `https://assets.mixkit.co/videos/${id}/${id}-thumb-720-0.jpg`,
});

// [photo id, colour it shows (or null), description for screen readers]
export const productPhotos = {
  'TFF-OVT': [
    ['photo-1666358777322-a25eda95848f', 'Black', 'Model wearing the oversized tee in black'],
    ['photo-1688990982651-a5d751773eff', 'Off-White', 'Model wearing the oversized tee in off-white'],
    ['photo-1666358085449-a10a39f33942', 'Cream', 'The oversized tee in cream, worn'],
    ['photo-1726140872004-850c80900ae3', 'Black', 'The oversized tee in black, styled on the street'],
  ],
  'TFF-SLT': [
    ['photo-1622519407650-3df9883f76a5', 'Black', 'The signature tee in black, worn with denim'],
    ['photo-1622445272461-c6580cab8755', 'Off-White', 'The signature tee in off-white'],
  ],
  'TFF-BHT': [
    ['photo-1726140872193-231b808dc4cb', 'Charcoal', 'The boxy heavyweight tee, worn on the street'],
    ['photo-1760801783147-e6379378e948', 'Stone', 'The boxy heavyweight tee in stone'],
  ],
  'TFF-RBT': [
    ['photo-1709899684187-72d8fb998319', 'Black', 'The ribbed baby tee in black, worn with jeans'],
    ['photo-1760552069014-78ff72ee7cac', 'Cream', 'A fitted cream top, outdoors'],
  ],
  'TFF-CHD': [
    ['photo-1673092147872-5ddb03194341', 'Black', 'The core hoodie in black'],
    ['photo-1611817757591-c3f345024273', 'Stone', 'The core hoodie in stone'],
    ['photo-1677538537484-324385aff147', 'Black', 'The core hoodie in black, in a car park'],
  ],
  'TFF-ZHD': [
    ['photo-1564858775545-e2d21c3ceee0', 'Charcoal', 'The zip hoodie in charcoal'],
    ['photo-1594118821806-c1cdc2031df6', 'Olive', 'The zip hoodie in a warm olive tone'],
    ['photo-1655141559697-f927ed68170c', 'Charcoal', 'Close-up of the zip and hood'],
  ],
  'TFF-CRH': [
    ['photo-1600348077475-d4db860d06f7', null, 'The cropped hoodie, worn outdoors'],
    ['photo-1666443762044-c6aa2a306cae', null, 'The cropped hoodie, side view'],
  ],
  'TFF-CRG': [
    ['photo-1548883354-7622d03aca27', 'Black', 'Close-up of the cargo pockets in black'],
    ['photo-1700676195099-75103510df39', 'Olive', 'The cargo in olive, full length'],
    ['photo-1700676195086-81b936390de4', 'Olive', 'The cargo in olive, styled'],
  ],
  'TFF-WLT': [
    ['photo-1762331224129-783a3ea1fc3f', 'Charcoal', 'The wide leg trouser in charcoal'],
    ['photo-1789697525521-5702b429940b', 'Cream', 'The wide leg trouser in cream'],
  ],
  'TFF-TRP': [['photo-1770918655041-5de83c95ccf9', 'Black', 'The track pant in black']],
  'TFF-CCJ': [
    ['photo-1777851830405-2e83094dc573', 'Black', 'The coach jacket in black'],
    ['photo-1644769752255-e80980882aeb', 'Black', 'The coach jacket in black, worn open'],
  ],
  'TFF-VSJ': [
    ['photo-1771310961652-1af9711686ec', 'Black', 'The varsity jacket, studio portrait'],
    ['photo-1652056871382-0820bba4a075', 'Black', 'Detail of the varsity jacket'],
  ],
  'TFF-DNT': [
    ['photo-1614693348454-1e0710d21c60', 'Washed Blue', 'The denim trucker in washed blue'],
    ['photo-1615943168243-5b2503679e47', 'Washed Blue', 'The denim trucker, worn open'],
    ['photo-1551537482-f2075a1d41f2', 'Washed Blue', 'The denim trucker against a blue wall'],
  ],
  'TFF-CAP': [
    ['photo-1521369909029-2afed882baee', null, 'The six-panel cap'],
    ['photo-1609868656710-4f299e957ec5', null, 'The six-panel cap, worn'],
    ['photo-1523380744952-b7e00e6e2ffa', null, 'The six-panel cap in hand'],
  ],
  'TFF-TOT': [
    ['photo-1574365569389-a10d488ca3fb', null, 'The canvas tote'],
    ['photo-1630381260512-e3fe55c11973', null, 'The canvas tote, carried'],
  ],
  'TFF-BNE': [
    ['photo-1543610892-0b1f7e6d8ac1', 'Charcoal', 'The rib beanie in charcoal, worn'],
    ['photo-1664289321749-07316ab5e374', 'Stone', 'The rib beanie in stone'],
  ],
};

// The demo tote is photographed in natural canvas, so its colour is renamed to match
export const colourFixes = [{ sku: 'TFF-TOT', from: 'Black', to: 'Natural', hex: '#E6DED0' }];

export const categoryPhotos = {
  't-shirts': photo('photo-1581655353564-df123a1eb820'),
  hoodies: photo('photo-1663573688938-2b3e7ea2ab33'),
  trousers: photo('photo-1766575694179-e159f786d2e3'),
  jackets: photo('photo-1604327538461-f825e0c56b8b'),
  accessories: photo('photo-1691689761290-2641cf0fc59a'),
};

const afterHours = film('50641');
export const collectionMedia = {
  'drop-001-foundation': { coverImageUrl: photo('photo-1644269444230-c6d1f2722e10') },
  'drop-002-after-hours': { coverImageUrl: afterHours.poster, coverVideoUrl: afterHours.url },
  essentials: { coverImageUrl: photo('photo-1592833578500-1082e18665a3') },
};

// Lookbook images in page order. Markers: [product SKU, x %, y %] measured on the whole photo.
export const lookbookImages = [
  {
    url: photo('photo-1603189343302-e603f7add05a'),
    products: [['TFF-CCJ', 30, 42], ['TFF-OVT', 44, 34], ['TFF-WLT', 52, 90]],
  },
  { url: photo('photo-1691689761290-2641cf0fc59a'), products: [['TFF-BNE', 30, 30], ['TFF-CHD', 64, 70]] },
  { url: photo('photo-1771310961652-1af9711686ec'), products: [['TFF-VSJ', 48, 52], ['TFF-WLT', 38, 86]] },
  {
    url: photo('photo-1601484437104-66abbd01c7f7'),
    products: [['TFF-CAP', 58, 44], ['TFF-BHT', 60, 52], ['TFF-TRP', 60, 66]],
  },
  { url: photo('photo-1647218947427-d783309440d2'), products: [['TFF-CRH', 48, 46], ['TFF-WLT', 50, 74], ['TFF-CAP', 50, 20]] },
  { url: photo('photo-1551537482-f2075a1d41f2'), products: [['TFF-DNT', 30, 62], ['TFF-OVT', 52, 52]] },
];

const studio = film('50639');
const city = film('4855');
// Hands guiding dark fabric under a needle — "made properly", shown rather than said
const atelier = film('11696');
export const homepageMedia = {
  HERO: { mediaType: 'VIDEO', mediaUrl: studio.url, posterUrl: studio.poster },
  MANIFESTO: { mediaType: 'VIDEO', mediaUrl: atelier.url, posterUrl: atelier.poster },
  EDITORIAL: { mediaType: 'IMAGE', mediaUrl: photo('photo-1532332248682-206cc786359f'), posterUrl: '' },
  CAMPAIGN_BANNER: { mediaType: 'VIDEO', mediaUrl: city.url, posterUrl: city.poster },
};

// ── Applying it ──────────────────────────────────────────────────────────

export const applyDemoMedia = async (prisma) => {
  const counts = { products: 0, categories: 0, collections: 0, lookbookImages: 0, homepage: 0 };

  for (const { sku, from, to, hex } of colourFixes) {
    const product = await prisma.product.findUnique({ where: { sku } });
    if (!product) continue;
    for (const variant of await prisma.productVariant.findMany({ where: { productId: product.id, colour: from } })) {
      const clash = await prisma.productVariant.findFirst({ where: { productId: product.id, colour: to, size: variant.size } });
      if (!clash) await prisma.productVariant.update({ where: { id: variant.id }, data: { colour: to, colourHex: hex } });
    }
  }

  for (const [sku, photos] of Object.entries(productPhotos)) {
    const product = await prisma.product.findUnique({ where: { sku }, include: { _count: { select: { images: true } } } });
    if (!product || product._count.images > 0) continue;
    await prisma.productImage.createMany({
      data: photos.map(([id, colour, alt], position) => ({ productId: product.id, url: photo(id), colour, alt, position })),
    });
    counts.products += 1;
  }

  for (const [slug, url] of Object.entries(categoryPhotos)) {
    const result = await prisma.category.updateMany({ where: { slug, imageUrl: null }, data: { imageUrl: url } });
    counts.categories += result.count;
  }

  for (const [slug, media] of Object.entries(collectionMedia)) {
    const result = await prisma.collection.updateMany({ where: { slug, coverImageUrl: null, coverVideoUrl: null }, data: media });
    counts.collections += result.count;
  }

  const lookbook = await prisma.lookbook.findUnique({
    where: { slug: 'foundation' },
    include: { items: { orderBy: { position: 'asc' }, include: { products: true } } },
  });
  if (lookbook) {
    for (const [index, item] of lookbook.items.entries()) {
      const media = lookbookImages[index];
      if (!media || item.mediaUrl) continue;
      await prisma.lookbookItem.update({ where: { id: item.id }, data: { mediaUrl: media.url, mediaType: 'IMAGE' } });
      // Markers are re-placed to match the new photo
      await prisma.lookbookProduct.deleteMany({ where: { itemId: item.id } });
      for (const [position, [sku, x, y]] of media.products.entries()) {
        const product = await prisma.product.findUnique({ where: { sku }, select: { id: true } });
        if (product) await prisma.lookbookProduct.create({ data: { itemId: item.id, productId: product.id, x, y, position } });
      }
      counts.lookbookImages += 1;
    }
  }

  for (const [type, media] of Object.entries(homepageMedia)) {
    const section = await prisma.homepageSection.findUnique({ where: { type } });
    if (!section || section.content?.mediaUrl) continue;
    await prisma.homepageSection.update({ where: { type }, data: { content: { ...section.content, ...media } } });
    counts.homepage += 1;
  }

  return counts;
};
