// End-to-end check of the API against a running server (npm run dev).
// Usage: node scripts/api-check.js
// It creates a test customer, orders and a product, then removes them again at
// the end. Run it against a development database only.
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

// Works whether it's run from the project root or from server/
dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)), quiet: true });

const prisma = new PrismaClient();

const BASE = `http://localhost:${process.env.PORT || 4000}/api`;
let passed = 0;
let failed = 0;

// A tiny cookie jar per "browser"
const session = () => {
  const jar = new Map();
  return async (method, path, body) => {
    const response = await fetch(BASE + path, {
      method,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        Cookie: [...jar].map(([k, v]) => `${k}=${v}`).join('; '),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    for (const cookie of response.headers.getSetCookie()) {
      const [pair] = cookie.split(';');
      const [name, value] = pair.split('=');
      if (value) jar.set(name, value);
      else jar.delete(name);
    }
    const json = await response.json().catch(() => null);
    return { status: response.status, data: json?.data, meta: json?.meta, error: json?.error };
  };
};

const check = (label, condition, detail = '') => {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${label}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${label} ${detail ? `— ${JSON.stringify(detail)}` : ''}`);
  }
};

const stamp = Date.now();
const shopper = session();
const admin = session();
const stranger = session();

const contact = {
  fullName: 'Test Shopper',
  email: `shopper${stamp}@example.com`,
  phone: '+234 801 234 5678',
  addressLine: '12 Test Street',
  city: 'Lagos',
  state: 'Lagos',
  deliveryOptionId: 'lagos',
};

// ── Clean up everything this run created, and return the stock its orders held ──
const cleanup = async () => {
  const orders = await prisma.order.findMany({ where: { email: contact.email }, include: { items: true } });
  for (const order of orders) {
    for (const item of order.items) {
      if (!order.stockReleased && item.variantId) {
        await prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
      }
      if (order.paidAt && item.productId) {
        await prisma.product.update({ where: { id: item.productId }, data: { salesCount: { decrement: item.quantity } } });
      }
    }
    if (order.paidAt && order.discountId) {
      await prisma.discount.update({ where: { id: order.discountId }, data: { usedCount: { decrement: 1 } } });
    }
  }
  await prisma.order.deleteMany({ where: { email: contact.email } });
  await prisma.customer.deleteMany({ where: { email: contact.email } });
  await prisma.newsletterSubscriber.deleteMany({ where: { email: `news${stamp}@example.com` } });
  await prisma.stockNotification.deleteMany({ where: { email: `wait${stamp}@example.com` } });
  await prisma.$disconnect();
  console.log('Test data removed.');
};

// If any step throws, still remove what was created
process.on('unhandledRejection', async (error) => {
  console.error(error);
  await cleanup().catch(() => {});
  process.exit(1);
});

console.log('\nCatalogue');
{
  const list = await shopper('GET', '/products?limit=5&sort=price_asc');
  const prices = list.data.map((p) => p.price);
  check('lists products with pagination', list.status === 200 && list.meta.total >= 1);
  check('sorts by price', prices.join() === [...prices].sort((a, b) => a - b).join());

  const filtered = await shopper('GET', '/products?sizes=XXL&colours=Black&availability=in_stock&limit=48');
  check(
    'size + colour + stock filter matches the same variant',
    filtered.data.every((p) => p.variants.some((v) => v.size === 'XXL' && v.colour === 'Black' && v.stock > 0)),
  );
  const soldOut = await shopper('GET', '/products?availability=sold_out');
  check('sold-out filter', soldOut.data.every((p) => p.soldOut));
  const bySku = await shopper('GET', '/products?q=TFF-VSJ');
  check('search by SKU', bySku.data.length === 1, bySku.data.map((p) => p.name));
  const byCategory = await shopper('GET', '/products?q=hoodies');
  check('search by category name', byCategory.data.length >= 1);
  const none = await shopper('GET', '/products?q=zzzzqqq');
  check('search with no results returns an empty list', none.status === 200 && none.data.length === 0);
  const missing = await shopper('GET', '/products/does-not-exist');
  check('unknown product → 404', missing.status === 404);
  const badQuery = await shopper('GET', '/products?sort=bogus');
  check('invalid query → 422', badQuery.status === 422);
  const upcoming = await shopper('GET', '/collections/drop-002-after-hours');
  check('upcoming drop hides its products', upcoming.data?.status === 'UPCOMING' && upcoming.data.products.length === 0);
  const facets = await shopper('GET', '/products/facets');
  check('facets', facets.data.sizes.length > 0 && facets.data.price.max > 0);
}

const products = (await shopper('GET', '/products?limit=48')).data;
const tee = products.find((p) => p.slug === 'tff-oversized-tee');
const inStock = tee.variants.find((v) => v.stock >= 2);
const outOfStock = products.flatMap((p) => p.variants).find((v) => v.stock === 0);

console.log('\nAccounts');
{
  const weak = await shopper('POST', '/auth/register', { ...contact, password: 'short', firstName: 'T', lastName: 'S' });
  check('weak password rejected', weak.status === 422);
  const anonWishlist = await shopper('GET', '/wishlist');
  check('wishlist requires sign-in', anonWishlist.status === 401);
}

console.log('\nBag (guest)');
{
  const add = await shopper('POST', '/cart/items', { variantId: inStock.id, quantity: 1 });
  check('add to bag', add.status === 200 && add.data.itemCount === 1, add.error);
  const soldOutAdd = await shopper('POST', '/cart/items', { variantId: outOfStock.id, quantity: 1 });
  check('sold-out variant cannot be added', soldOutAdd.status === 409, soldOutAdd.error);
  const tooMany = await shopper('PATCH', `/cart/items/${add.data.items[0].id}`, { quantity: inStock.stock + 1 > 10 ? 10 : inStock.stock + 1 });
  check('quantity beyond stock rejected', inStock.stock >= 10 || tooMany.status === 409, tooMany.error);
  const qty = await shopper('PATCH', `/cart/items/${add.data.items[0].id}`, { quantity: 2 });
  check('change quantity', qty.data.itemCount === 2 && qty.data.subtotal === tee.price * 2);
  const saved = await shopper('PATCH', `/cart/items/${add.data.items[0].id}`, { savedForLater: true });
  check('save for later', saved.data.items.length === 0 && saved.data.saved.length === 1);
  const back = await shopper('PATCH', `/cart/items/${add.data.items[0].id}`, { savedForLater: false });
  check('move back to bag', back.data.items.length === 1);
  const otherCart = await stranger('GET', '/cart');
  check('bags are private per visitor', otherCart.data.itemCount === 0);
}

console.log('\nAccounts (continued)');
{
  const register = await shopper('POST', '/auth/register', {
    email: contact.email,
    password: 'test-password-1',
    firstName: 'Test',
    lastName: 'Shopper',
  });
  check('register', register.status === 201, register.error);
  const cart = await shopper('GET', '/cart');
  check('guest bag follows the customer after sign-up', cart.data.itemCount === 2);
  const duplicate = await stranger('POST', '/auth/register', {
    email: contact.email,
    password: 'test-password-1',
    firstName: 'A',
    lastName: 'B',
  });
  check('duplicate email rejected', duplicate.status === 409);
  const badLogin = await stranger('POST', '/auth/login', { email: contact.email, password: 'wrong-password' });
  check('wrong password rejected', badLogin.status === 401);
  const wish = await shopper('POST', '/wishlist', { productId: tee.id });
  check('add to wishlist', wish.data.length === 1);
  const unwish = await shopper('DELETE', `/wishlist/${tee.id}`);
  check('remove from wishlist', unwish.data.length === 0);
}

console.log('\nCheckout');
let orderNumber;
let reference;
{
  const badCode = await shopper('POST', '/orders/quote', { deliveryOptionId: 'lagos', discountCode: 'NOPE' });
  check('invalid discount reported', badCode.data.discountError && !badCode.data.discount);
  const quote = await shopper('POST', '/orders/quote', { deliveryOptionId: 'lagos', discountCode: 'welcome10' });
  check('discount applied in quote', quote.data.discount?.amount === Math.floor(tee.price * 2 * 0.1), quote.data);

  const invalid = await shopper('POST', '/orders', { ...contact, phone: 'abc' });
  check('invalid checkout details rejected', invalid.status === 422);
  const emptyCart = await stranger('POST', '/orders', contact);
  check('empty bag cannot check out', emptyCart.status === 400);

  // With Paystack keys the payment link is a real Paystack checkout page. Outcomes are then
  // delivered the way Paystack delivers them: a webhook signed with the secret key.
  const provider = (await shopper('GET', '/payments/config')).data.provider;
  console.log(`  (payments: ${provider})`);
  const referenceFor = async (number) => (await shopper('GET', `/orders/${number}`)).data.payment.reference;
  const pay = async (ref, outcome) => {
    if (provider !== 'paystack') return shopper('POST', '/payments/sandbox', { reference: ref, outcome });
    const payment = await prisma.payment.findUnique({ where: { reference: ref } });
    const body = JSON.stringify({
      event: outcome === 'success' ? 'charge.success' : 'charge.failed',
      data: { reference: ref, amount: payment.amount * 100, channel: 'card', gateway_response: 'Declined (test)' },
    });
    const signature = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(body).digest('hex');
    const response = await fetch(`${BASE}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': signature },
      body,
    });
    const order = await prisma.order.findFirst({ where: { payment: { reference: ref } } });
    return { status: response.status, data: { outcome: order.status === 'PAID' ? 'success' : order.status === 'CANCELLED' ? 'failed' : 'pending' } };
  };

  const before = (await shopper('GET', '/products/tff-oversized-tee')).data.variants.find((v) => v.id === inStock.id).stock;
  const order = await shopper('POST', '/orders', { ...contact, discountCode: 'WELCOME10', saveAddress: true });
  check('order created with payment link', order.status === 201 && order.data.authorizationUrl, order.error);
  if (provider === 'paystack') {
    check('payment link is a real Paystack checkout', new URL(order.data.authorizationUrl).hostname.endsWith('paystack.com'), order.data.authorizationUrl);
  }
  orderNumber = order.data.orderNumber;
  reference = await referenceFor(orderNumber);
  const during = (await shopper('GET', '/products/tff-oversized-tee')).data.variants.find((v) => v.id === inStock.id).stock;
  check('stock reserved at checkout', during === before - 2, { before, during });

  if (provider === 'paystack') {
    const forged = await fetch(`${BASE}/payments/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-paystack-signature': 'forged' },
      body: JSON.stringify({ event: 'charge.success', data: { reference, amount: 999999999 } }),
    });
    check('forged payment webhook rejected', forged.status === 401);
    const unpaid = await shopper('POST', '/payments/verify', { reference });
    check('Paystack reports the unpaid order as not paid', unpaid.data?.outcome === 'pending', unpaid.error || unpaid.data);
  }

  // Decline, and the stock must come back
  const declined = await pay(reference, 'failed');
  check('failed payment cancels the order', declined.data.outcome === 'failed');
  const after = (await shopper('GET', '/products/tff-oversized-tee')).data.variants.find((v) => v.id === inStock.id).stock;
  check('stock released after failed payment', after === before, { before, after });
  const stillInBag = await shopper('GET', '/cart');
  check('bag kept after failed payment', stillInBag.data.itemCount === 2);

  // Try again and pay
  const retry = await shopper('POST', '/orders', { ...contact, discountCode: 'WELCOME10' });
  orderNumber = retry.data.orderNumber;
  reference = await referenceFor(orderNumber);
  const bogus = await shopper('POST', '/payments/verify', { reference: 'TFF-NOTREAL-123456' });
  check('unknown payment reference → 404', bogus.status === 404);
  const pending = await shopper('POST', '/payments/verify', { reference });
  check('unpaid order is not confirmed by verify', pending.data?.outcome === 'pending', pending.error);
  const paid = await pay(reference, 'success');
  check('successful payment', paid.data.outcome === 'success');
  const again = await pay(reference, 'success');
  check('confirming twice is harmless', again.data.outcome === 'success');
  const finalStock = (await shopper('GET', '/products/tff-oversized-tee')).data.variants.find((v) => v.id === inStock.id).stock;
  check('stock deducted exactly once', finalStock === before - 2, { before, finalStock });
  const emptied = await shopper('GET', '/cart');
  check('bag emptied after payment', emptied.data.itemCount === 0);

  const tracked = await shopper('GET', `/orders/${orderNumber}`);
  check('owner can track the order', tracked.data?.status === 'PAID' && tracked.data.discountTotal > 0, tracked.error);
  const snoop = await stranger('GET', `/orders/${orderNumber}`);
  check('stranger cannot view the order', snoop.status === 404);
  const wrongEmail = await stranger('GET', `/orders/${orderNumber}?email=nobody@example.com`);
  check('wrong email cannot view the order', wrongEmail.status === 404);
  const byEmail = await stranger('GET', `/orders/${orderNumber}?email=${encodeURIComponent(contact.email)}`);
  check('guest lookup by number + email', byEmail.status === 200);
  const mine = await shopper('GET', '/orders');
  check('order history', mine.data.length === 2);
}

console.log('\nEngagement');
{
  const review = await shopper('POST', '/reviews', { productId: tee.id, rating: 5, title: 'Great', comment: 'Heavy and well cut.' });
  check('submit review', review.status === 201);
  const hidden = await shopper('GET', '/products/tff-oversized-tee/reviews');
  check('review hidden until approved', hidden.data.length === 0);
  const news = await stranger('POST', '/newsletter', { email: `news${stamp}@example.com` });
  check('newsletter signup', news.status === 200);
  const badNews = await stranger('POST', '/newsletter', { email: 'not-an-email' });
  check('newsletter rejects bad email', badNews.status === 422);
  const notify = await stranger('POST', '/stock-notifications', { email: `wait${stamp}@example.com`, variantId: outOfStock.id });
  check('notify-me signup', notify.status === 201, notify.error);
}

console.log('\nAdmin');
{
  check('admin routes reject visitors', (await stranger('GET', '/admin/orders')).status === 401);
  check('admin routes reject customers', (await shopper('GET', '/admin/orders')).status === 401);
  const badAdmin = await admin('POST', '/admin/auth/login', { email: process.env.ADMIN_EMAIL, password: 'wrong' });
  check('wrong admin password rejected', badAdmin.status === 401);
  const login = await admin('POST', '/admin/auth/login', { email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD });
  check('admin login', login.status === 200, login.error);

  const overview = await admin('GET', '/admin/overview');
  check('overview has revenue', overview.data?.revenue > 0 && overview.data.series.length === 30, overview.error);

  const orders = await admin('GET', `/admin/orders?q=${orderNumber}`);
  const orderId = orders.data[0].id;
  const skip = await admin('PATCH', `/admin/orders/${orderId}/status`, { status: 'DELIVERED' });
  check('cannot skip order steps', skip.status === 400);
  for (const status of ['PROCESSING', 'SHIPPED', 'DELIVERED']) {
    const moved = await admin('PATCH', `/admin/orders/${orderId}/status`, { status, trackingNumber: status === 'SHIPPED' ? 'GIG123' : '' });
    check(`order → ${status}`, moved.data?.status === status, moved.error);
  }
  const events = (await admin('GET', `/admin/orders/${orderId}`)).data.events.map((e) => e.status);
  check('status history recorded', events.join() === 'PENDING,PAID,PROCESSING,SHIPPED,DELIVERED', events);

  const reviews = await admin('GET', '/admin/reviews?status=PENDING');
  const approve = await admin('PATCH', `/admin/reviews/${reviews.data[0].id}`, { status: 'APPROVED' });
  check('approve review', approve.data.status === 'APPROVED');
  const shown = await shopper('GET', '/products/tff-oversized-tee/reviews');
  check('approved review is public', shown.data.length === 1 && shown.data[0].customerName === 'Test S.');
  await admin('DELETE', `/admin/reviews/${reviews.data[0].id}`);

  const restock = await admin('PATCH', `/admin/inventory/${outOfStock.id}`, { stock: 3 });
  check('restock notifies waiting customers', restock.data.notified === 1, restock.data);
  await admin('PATCH', `/admin/inventory/${outOfStock.id}`, { stock: 0 });

  const draft = {
    name: `Check Product ${stamp}`,
    description: 'Created by the API check.',
    price: 10000,
    gender: 'UNISEX',
    status: 'DRAFT',
    variants: [
      { colour: 'Black', colourHex: '#111111', size: 'M', stock: 2 },
      { colour: 'Black', colourHex: '#111111', size: 'L', stock: 0 },
    ],
  };
  const noVariants = await admin('POST', '/admin/products', { ...draft, variants: [] });
  check('product without variants rejected', noVariants.status === 422);
  const noImage = await admin('POST', '/admin/products', { ...draft, status: 'PUBLISHED' });
  check('publishing without an image rejected', noImage.status === 422);
  const createdProduct = await admin('POST', '/admin/products', draft);
  check('create product', createdProduct.status === 201 && createdProduct.data.variants.length === 2, createdProduct.error);
  const productId = createdProduct.data.id;
  check('draft is not public', (await shopper('GET', `/products/${createdProduct.data.slug}`)).status === 404);

  const keptVariantId = createdProduct.data.variants.find((v) => v.size === 'M').id;
  const edited = await admin('PUT', `/admin/products/${productId}`, {
    ...draft,
    price: 12000,
    variants: [
      { colour: 'Black', colourHex: '#111111', size: 'M', stock: 5 },
      { colour: 'Cream', colourHex: '#E2D8C5', size: 'M', stock: 1 },
    ],
  });
  check(
    'edit product keeps variant ids, adds and removes variants',
    edited.data?.price === 12000 &&
      edited.data.variants.length === 2 &&
      edited.data.variants.some((v) => v.id === keptVariantId && v.stock === 5),
    edited.error,
  );
  const archived = await admin('PATCH', `/admin/products/${productId}/status`, { status: 'ARCHIVED' });
  check('archive product', archived.data.status === 'ARCHIVED');
  const removed = await admin('DELETE', `/admin/products/${productId}`);
  check('delete product', removed.status === 200);
  check('deleting again → 404', (await admin('DELETE', `/admin/products/${productId}`)).status === 404);

  const discount = await admin('POST', '/admin/discounts', { code: `CHK${stamp}`, type: 'PERCENTAGE', value: 150 });
  check('discount over 100% rejected', discount.status === 422);
  const sections = await admin('GET', '/admin/homepage');
  check('homepage sections listed', sections.data.length === 11);
  const settings = await admin('GET', '/admin/settings');
  check('settings', settings.data.delivery.length >= 1);
  const upload = await fetch(`${BASE}/admin/media`, { method: 'POST' });
  check('upload requires admin', upload.status === 401);
}

await cleanup();

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
