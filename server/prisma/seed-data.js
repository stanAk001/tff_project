// ─────────────────────────────────────────────────────────────────────────
// DEMO CONTENT
// Everything in this file is placeholder catalogue data so the site has
// something to show before real TFF products are added. None of it is needed
// for the site to work. To start with an empty store instead, run:
//
//   SEED_DEMO=false npm run db:seed
//
// Demo products have no photos on purpose — the storefront shows clearly
// labelled placeholder frames until real images are uploaded in the admin.
// ─────────────────────────────────────────────────────────────────────────

export const COLOURS = {
  Black: '#121212',
  'Off-White': '#ECE8E0',
  Cream: '#E2D8C5',
  Charcoal: '#3A3A3C',
  Stone: '#A9A397',
  Olive: '#5B5C46',
  'Washed Blue': '#7D8EA2',
  Espresso: '#3C2B23',
};

const APPAREL = ['S', 'M', 'L', 'XL', 'XXL'];
const WOMENS = ['XS', 'S', 'M', 'L'];
const ONE = ['One Size'];

const TOP_GUIDE = {
  unit: 'cm',
  columns: ['Size', 'Chest', 'Length', 'Shoulder'],
  rows: [
    ['S', '112', '70', '54'],
    ['M', '118', '72', '56'],
    ['L', '124', '74', '58'],
    ['XL', '130', '76', '60'],
    ['XXL', '136', '78', '62'],
  ],
};

const BOTTOM_GUIDE = {
  unit: 'cm',
  columns: ['Size', 'Waist', 'Hip', 'Inseam'],
  rows: [
    ['S', '76', '104', '78'],
    ['M', '81', '109', '79'],
    ['L', '86', '114', '80'],
    ['XL', '91', '119', '81'],
    ['XXL', '96', '124', '82'],
  ],
};

export const categories = [
  { name: 'T-Shirts', slug: 't-shirts', description: 'Heavyweight cotton, cut with room to move.', sizeGuide: TOP_GUIDE },
  { name: 'Hoodies', slug: 'hoodies', description: 'Brushed fleece in considered proportions.', sizeGuide: TOP_GUIDE },
  { name: 'Trousers', slug: 'trousers', description: 'Cargos, wide legs and everyday tailoring.', sizeGuide: BOTTOM_GUIDE },
  { name: 'Jackets', slug: 'jackets', description: 'Outer layers built to be lived in.', sizeGuide: TOP_GUIDE },
  { name: 'Accessories', slug: 'accessories', description: 'The finishing pieces.', sizeGuide: null },
];

// stock: either one number for every size, or a list matching the sizes
export const products = [
  {
    name: 'TFF Oversized Tee',
    sku: 'TFF-OVT',
    category: 't-shirts',
    gender: 'UNISEX',
    price: 45000,
    description:
      'Our signature silhouette. Cut from 260gsm combed cotton jersey with a dropped shoulder and a wide, boxy body. Garment-washed for a broken-in hand feel from the first wear.',
    tags: ['tee', 'oversized', 'core'],
    colours: { Black: [4, 8, 5, 6, 2], 'Off-White': [0, 7, 9, 3, 0], Cream: [5, 5, 4, 0, 1] },
    sizes: APPAREL,
    featured: true,
    bestseller: true,
    salesCount: 48,
  },
  {
    name: 'TFF Signature Logo Tee',
    sku: 'TFF-SLT',
    category: 't-shirts',
    gender: 'UNISEX',
    price: 38000,
    description:
      'A regular-fit tee in midweight cotton, finished with a tonal TFF wordmark embroidered at the chest. Understated by design.',
    tags: ['tee', 'logo'],
    colours: { Black: 9, 'Off-White': 7 },
    sizes: APPAREL,
    salesCount: 31,
  },
  {
    name: 'TFF Boxy Heavyweight Tee',
    sku: 'TFF-BHT',
    category: 't-shirts',
    gender: 'MEN',
    price: 48000,
    description:
      'A cropped, square cut in 300gsm cotton. Thick ribbed collar, double-needle hems and a structured drape that holds its shape.',
    tags: ['tee', 'heavyweight'],
    colours: { Charcoal: [6, 8, 8, 4, 2], Stone: [3, 6, 5, 2, 0] },
    sizes: APPAREL,
    isNew: true,
    salesCount: 12,
  },
  {
    name: 'TFF Ribbed Baby Tee',
    sku: 'TFF-RBT',
    category: 't-shirts',
    gender: 'WOMEN',
    price: 32000,
    description:
      'A close-fitting tee in stretch rib cotton with a slightly cropped length. Designed to layer under everything.',
    tags: ['tee', 'fitted'],
    colours: { Black: [5, 8, 6, 3], Cream: [4, 6, 2, 0] },
    sizes: WOMENS,
    isNew: true,
    salesCount: 19,
  },
  {
    name: 'TFF Core Hoodie',
    sku: 'TFF-CHD',
    category: 'hoodies',
    gender: 'UNISEX',
    price: 78000,
    description:
      'The hoodie we wear every day. 420gsm brushed-back fleece, a double-layered hood with no drawcords, and a relaxed body that sits just below the hip.',
    tags: ['hoodie', 'fleece', 'core'],
    colours: { Black: [6, 10, 8, 5, 3], Stone: [2, 5, 6, 3, 1] },
    sizes: APPAREL,
    featured: true,
    bestseller: true,
    salesCount: 57,
  },
  {
    name: 'TFF Zip Hoodie',
    sku: 'TFF-ZHD',
    category: 'hoodies',
    gender: 'UNISEX',
    price: 85000,
    description:
      'A full-zip take on the Core Hoodie with a two-way metal zip and split kangaroo pockets. Cut slightly boxier through the body.',
    tags: ['hoodie', 'zip'],
    colours: { Charcoal: [4, 6, 6, 3, 2], Olive: [3, 4, 3, 1, 0] },
    sizes: APPAREL,
    isNew: true,
    salesCount: 9,
  },
  {
    name: 'TFF Cropped Hoodie',
    sku: 'TFF-CRH',
    category: 'hoodies',
    gender: 'WOMEN',
    price: 72000,
    description:
      'Our heavyweight fleece in a cropped length with a raw-edge hem and dropped shoulders. Pairs with high-waisted everything.',
    tags: ['hoodie', 'cropped'],
    colours: { Cream: [4, 7, 5, 2], Black: [3, 5, 5, 1] },
    sizes: WOMENS,
    salesCount: 22,
  },
  {
    name: 'TFF Cargo',
    sku: 'TFF-CRG',
    category: 'trousers',
    gender: 'UNISEX',
    price: 65000,
    description:
      'A wide-leg cargo in washed cotton twill. Six pockets, adjustable hem toggles and a mid-rise waist that sits clean under a tee.',
    tags: ['cargo', 'trousers'],
    colours: { Black: [5, 8, 7, 4, 2], Olive: [3, 6, 4, 2, 0], Stone: [2, 3, 3, 0, 0] },
    sizes: APPAREL,
    featured: true,
    salesCount: 41,
  },
  {
    name: 'TFF Wide Leg Trouser',
    sku: 'TFF-WLT',
    category: 'trousers',
    gender: 'UNISEX',
    price: 70000,
    description:
      'Tailored through the waist, generous through the leg. A pleated trouser in a fluid twill that moves when you do.',
    tags: ['trousers', 'tailoring'],
    colours: { Charcoal: [4, 6, 5, 3, 1], Cream: [2, 4, 3, 1, 0] },
    sizes: APPAREL,
    isNew: true,
    salesCount: 8,
  },
  {
    name: 'TFF Track Pant',
    sku: 'TFF-TRP',
    category: 'trousers',
    gender: 'UNISEX',
    price: 55000,
    compareAtPrice: 68000,
    description:
      'A straight-leg track pant in crisp nylon with a mesh lining, zipped pockets and an elasticated waist with internal drawcord.',
    tags: ['trousers', 'track'],
    colours: { Black: [6, 6, 4, 2, 1] },
    sizes: APPAREL,
    salesCount: 27,
  },
  {
    name: 'TFF Coach Jacket',
    sku: 'TFF-CCJ',
    category: 'jackets',
    gender: 'UNISEX',
    price: 85000,
    description:
      'A lightweight coach jacket in water-resistant nylon. Snap front, drawcord hem and a tonal wordmark across the back yoke.',
    tags: ['jacket', 'outerwear'],
    colours: { Black: [3, 6, 6, 4, 1], Olive: [2, 3, 4, 1, 0] },
    sizes: APPAREL,
    featured: true,
    salesCount: 33,
  },
  {
    name: 'TFF Varsity Jacket',
    sku: 'TFF-VSJ',
    category: 'jackets',
    gender: 'UNISEX',
    price: 145000,
    description:
      'Melton wool body with leather sleeves and chenille TFF lettering. Made in a single numbered run — once it is gone, it is gone.',
    tags: ['jacket', 'varsity', 'limited'],
    colours: { Black: [1, 2, 3, 1, 0] },
    sizes: APPAREL,
    limited: true,
    featured: true,
    salesCount: 14,
  },
  {
    name: 'TFF Denim Trucker',
    sku: 'TFF-DNT',
    category: 'jackets',
    gender: 'UNISEX',
    price: 110000,
    description:
      'A boxy trucker in 13oz rigid denim, stone-washed to a soft mid blue. Branded shank buttons and a slightly cropped body.',
    tags: ['jacket', 'denim'],
    colours: { 'Washed Blue': [3, 5, 4, 2, 1] },
    sizes: APPAREL,
    isNew: true,
    salesCount: 6,
  },
  {
    name: 'TFF Six-Panel Cap',
    sku: 'TFF-CAP',
    category: 'accessories',
    gender: 'UNISEX',
    price: 22000,
    description: 'An unstructured six-panel cap in washed cotton twill with a tonal embroidered wordmark and brass clasp.',
    tags: ['cap', 'accessory'],
    colours: { Black: 14, Cream: 9, Olive: 3 },
    sizes: ONE,
    salesCount: 38,
  },
  {
    name: 'TFF Canvas Tote',
    sku: 'TFF-TOT',
    category: 'accessories',
    gender: 'UNISEX',
    price: 28000,
    description: 'A heavyweight 16oz canvas tote with reinforced handles, an internal zip pocket and screen-printed wordmark.',
    tags: ['tote', 'bag', 'accessory'],
    colours: { Black: 0 },
    sizes: ONE,
    salesCount: 52,
  },
  {
    name: 'TFF Rib Beanie',
    sku: 'TFF-BNE',
    category: 'accessories',
    gender: 'UNISEX',
    price: 18000,
    description: 'A fisherman-rib beanie in a soft merino blend, finished with a woven TFF label at the cuff.',
    tags: ['beanie', 'accessory'],
    colours: { Charcoal: 11, Stone: 6 },
    sizes: ONE,
    salesCount: 17,
  },
];

const DAY = 24 * 60 * 60 * 1000;

export const collections = [
  {
    name: 'Drop 001 — Foundation',
    slug: 'drop-001-foundation',
    description:
      'The first chapter. Eight pieces that set the shape of everything to come: heavy cotton, wide cuts and nothing that doesn’t need to be there.',
    status: 'ACTIVE',
    isDrop: true,
    dropNumber: 1,
    featured: true,
    launchDate: new Date(Date.now() - 40 * DAY),
    products: ['TFF-OVT', 'TFF-CHD', 'TFF-CRG', 'TFF-CCJ', 'TFF-VSJ', 'TFF-CAP', 'TFF-BHT', 'TFF-TOT'],
  },
  {
    name: 'Drop 002 — After Hours',
    slug: 'drop-002-after-hours',
    description:
      'Made for the hours after the day is done. Deeper tones, softer tailoring and a limited run of outerwear.',
    status: 'UPCOMING',
    isDrop: true,
    dropNumber: 2,
    launchDate: new Date(Date.now() + 18 * DAY),
    products: ['TFF-WLT', 'TFF-ZHD', 'TFF-DNT'],
  },
  {
    name: 'Essentials',
    slug: 'essentials',
    description: 'The pieces we keep in stock all year. The foundation of the wardrobe, always available.',
    status: 'ACTIVE',
    isDrop: false,
    launchDate: null,
    products: ['TFF-OVT', 'TFF-SLT', 'TFF-CHD', 'TFF-TRP', 'TFF-RBT', 'TFF-CRH', 'TFF-BNE'],
  },
];

// Hotspot positions are percentages of the image, from its top-left corner
export const lookbook = {
  title: 'Foundation',
  slug: 'foundation',
  season: 'Drop 001',
  description:
    'Shot over two days between Lagos Island and the mainland. The first collection, worn the way it was designed to be.',
  items: [
    { layout: 'FULL', caption: 'Look 01 — The uniform', products: [['TFF-CCJ', 46, 34], ['TFF-OVT', 56, 48], ['TFF-CRG', 50, 74]] },
    { layout: 'TALL', caption: 'Look 02', products: [['TFF-CHD', 50, 40], ['TFF-WLT', 48, 76]] },
    { layout: 'HALF', caption: 'Look 03', products: [['TFF-VSJ', 52, 38]] },
    { layout: 'WIDE', caption: 'Look 04 — In motion', products: [['TFF-BHT', 40, 42], ['TFF-TRP', 44, 72], ['TFF-CAP', 42, 14]] },
    { layout: 'HALF', caption: 'Look 05', products: [['TFF-CRH', 50, 36]] },
    { layout: 'TALL', caption: 'Look 06', products: [['TFF-DNT', 50, 38], ['TFF-CRG', 50, 74]] },
  ],
};

// One row per homepage section, in display order. Media is left empty so the
// storefront shows placeholder frames until real campaign media is uploaded.
export const homepageSections = [
  {
    type: 'HERO',
    content: {
      eyebrow: 'Drop 001 — The Collection',
      heading: 'Made to stand apart.',
      subheading: 'Eight pieces. Heavy cotton, wide cuts, nothing that doesn’t need to be there.',
      ctaLabel: 'Shop the collection',
      ctaHref: '/collections/drop-001-foundation',
      cta2Label: 'View lookbook',
      cta2Href: '/lookbook',
      mediaType: 'IMAGE',
      mediaUrl: '',
      posterUrl: '',
    },
  },
  {
    type: 'MANIFESTO',
    content: {
      eyebrow: 'The label',
      keyword: 'Fewer',
      heading:
        'Fewer pieces. Made properly. Released in limited runs for people who already know what they want to wear.',
      body: 'Designed in Lagos',
      ctaLabel: 'Read the lookbook',
      ctaHref: '/lookbook',
    },
  },
  {
    type: 'NEW_DROP',
    content: {
      eyebrow: 'Drop 001 — The Collection',
      heading: 'Designed for the way you move.',
      body: 'Heavy cotton, wide cuts, considered details. The first chapter of TFF is here.',
      ctaLabel: 'Shop the drop',
      ctaHref: '/collections/drop-001-foundation',
    },
    products: ['TFF-OVT', 'TFF-CRG', 'TFF-CCJ', 'TFF-CHD'],
  },
  { type: 'CATEGORIES', content: { eyebrow: 'Shop by category', heading: 'Find your piece' } },
  {
    type: 'FEATURED_PRODUCTS',
    content: { eyebrow: 'Selected', heading: 'Pieces of the moment', ctaLabel: 'View all', ctaHref: '/shop' },
    products: ['TFF-VSJ', 'TFF-BHT', 'TFF-WLT', 'TFF-ZHD', 'TFF-DNT', 'TFF-CAP', 'TFF-RBT', 'TFF-TRP'],
  },
  {
    type: 'EDITORIAL',
    content: {
      eyebrow: 'The label',
      heading: 'More than what you wear.',
      body: 'TFF started with a simple idea: make fewer things, and make them properly. Every piece is designed in Lagos, cut from fabric we would wear ourselves, and released in limited runs. No seasons, no noise — just clothes that earn their place.',
      ctaLabel: 'Explore the lookbook',
      ctaHref: '/lookbook',
      mediaType: 'IMAGE',
      mediaUrl: '',
      posterUrl: '',
    },
  },
  {
    type: 'SHOP_THE_LOOK',
    content: { eyebrow: 'Shop the look', heading: 'The uniform', body: 'Three pieces, one silhouette. Tap a marker to shop what’s in the frame.' },
  },
  {
    type: 'FEATURED_COLLECTION',
    content: { eyebrow: 'Coming soon', ctaLabel: 'Preview the drop' },
    collections: ['drop-002-after-hours'],
  },
  {
    type: 'CAMPAIGN_BANNER',
    content: {
      heading: 'Made in limited runs.',
      subheading: 'When it’s gone, it’s gone.',
      ctaLabel: 'Shop all',
      ctaHref: '/shop',
      mediaType: 'IMAGE',
      mediaUrl: '',
      posterUrl: '',
    },
  },
  { type: 'LOOKBOOK', content: { eyebrow: 'Lookbook', heading: 'Foundation, in frame', ctaLabel: 'View the lookbook' } },
  {
    type: 'NEWSLETTER',
    content: { heading: 'Join TFF', body: 'Get first access to new drops and collections.' },
  },
];

export const discounts = [
  { code: 'WELCOME10', type: 'PERCENTAGE', value: 10, minOrderAmount: 0 },
  { code: 'TFF5000', type: 'FIXED', value: 5000, minOrderAmount: 60000 },
];
