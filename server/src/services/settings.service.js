import { prisma } from '../config/prisma.js';

// Used until the owner saves their own values from Admin → Settings.
export const DEFAULT_SETTINGS = {
  store: {
    announcement: 'Free delivery in Lagos on orders over ₦150,000',
    deliveryInfo:
      'Orders are dispatched within 1–2 working days. Lagos deliveries arrive in 1–3 days; other states in 3–7 days.',
    returnsInfo:
      'Unworn pieces with tags attached can be returned within 7 days of delivery for an exchange or store credit.',
    contactEmail: 'hello@tff.example',
    instagram: '',
    lowStockThreshold: 3,
  },
  delivery: [
    { id: 'lagos', name: 'Lagos delivery', description: '1–3 working days', price: 3500, freeAbove: 150000 },
    { id: 'nationwide', name: 'Nationwide delivery', description: '3–7 working days', price: 6500, freeAbove: 0 },
    { id: 'pickup', name: 'Studio pickup', description: 'Collect in Lagos — we will email when ready', price: 0, freeAbove: 0 },
  ],
};

export const getSettings = async () => {
  const rows = await prisma.setting.findMany();
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    store: { ...DEFAULT_SETTINGS.store, ...(saved.store || {}) },
    delivery: Array.isArray(saved.delivery) ? saved.delivery : DEFAULT_SETTINGS.delivery,
  };
};

export const saveSettings = async ({ store, delivery }) => {
  const writes = [];
  if (store) {
    writes.push(
      prisma.setting.upsert({ where: { key: 'store' }, create: { key: 'store', value: store }, update: { value: store } }),
    );
  }
  if (delivery) {
    writes.push(
      prisma.setting.upsert({
        where: { key: 'delivery' },
        create: { key: 'delivery', value: delivery },
        update: { value: delivery },
      }),
    );
  }
  await prisma.$transaction(writes);
  return getSettings();
};

// Each delivery option can be free once the order reaches its own "free above" amount.
export const deliveryFeeFor = (settings, optionId, subtotal) => {
  const option = settings.delivery.find((item) => item.id === optionId);
  if (!option) return null;
  const freeAbove = Number(option.freeAbove) || 0;
  const free = freeAbove > 0 && subtotal >= freeAbove;
  return { option, fee: free ? 0 : Number(option.price) || 0 };
};
