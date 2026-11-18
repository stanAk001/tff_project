import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { COOKIES, cookieOptions, newCartToken } from '../utils/tokens.js';

const CART_COOKIE_AGE = 60 * 24 * 60 * 60 * 1000; // 60 days
export const MAX_QUANTITY = 10;

const cartInclude = {
  items: {
    orderBy: { createdAt: 'asc' },
    include: {
      variant: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              compareAtPrice: true,
              status: true,
              images: { orderBy: { position: 'asc' }, select: { url: true, colour: true } },
            },
          },
        },
      },
    },
  },
};

// Prefer a photo of the chosen colour, otherwise the product's first image.
export const imageForVariant = (product, colour) =>
  (product.images.find((image) => image.colour?.toLowerCase() === colour.toLowerCase()) || product.images[0])?.url ||
  null;

export const findCart = (req) => {
  if (req.customerId) return prisma.cart.findUnique({ where: { customerId: req.customerId }, include: cartInclude });
  const token = req.cookies?.[COOKIES.cart];
  return token ? prisma.cart.findUnique({ where: { token }, include: cartInclude }) : null;
};

export const ensureCart = async (req, res) => {
  const existing = await findCart(req);
  if (existing) return existing;

  if (req.customerId) {
    return prisma.cart.create({ data: { customerId: req.customerId }, include: cartInclude });
  }
  const token = newCartToken();
  res.cookie(COOKIES.cart, token, cookieOptions(CART_COOKIE_AGE));
  return prisma.cart.create({ data: { token }, include: cartInclude });
};

export const serializeCart = (cart) => {
  const items = (cart?.items || []).map((item) => {
    const { variant } = item;
    const { product } = variant;
    const purchasable = product.status === 'PUBLISHED' && variant.stock > 0;
    let issue = null;
    if (!purchasable) issue = 'UNAVAILABLE';
    else if (item.quantity > variant.stock) issue = 'INSUFFICIENT_STOCK';

    return {
      id: item.id,
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      slug: product.slug,
      colour: variant.colour,
      size: variant.size,
      imageUrl: imageForVariant(product, variant.colour),
      unitPrice: product.price,
      compareAtPrice: product.compareAtPrice,
      quantity: item.quantity,
      stock: variant.stock,
      lineTotal: product.price * item.quantity,
      savedForLater: item.savedForLater,
      issue,
    };
  });

  const active = items.filter((item) => !item.savedForLater);
  return {
    items: active,
    saved: items.filter((item) => item.savedForLater),
    itemCount: active.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: active.filter((item) => item.issue !== 'UNAVAILABLE').reduce((sum, item) => sum + item.lineTotal, 0),
    hasIssues: active.some((item) => item.issue),
  };
};

const reload = (cartId) => prisma.cart.findUnique({ where: { id: cartId }, include: cartInclude });

const stockMessage = (stock) =>
  stock === 0 ? 'This piece has just sold out.' : `Only ${stock} left in this size.`;

export const addItem = async (cart, variantId, quantity) => {
  const variant = await prisma.productVariant.findUnique({
    where: { id: variantId },
    include: { product: { select: { status: true } } },
  });
  if (!variant || variant.product.status !== 'PUBLISHED') throw ApiError.notFound('That piece is no longer available.');

  const existing = cart.items.find((item) => item.variantId === variantId);
  // Adding a saved item again moves it back into the bag
  const current = existing && !existing.savedForLater ? existing.quantity : 0;
  const wanted = Math.min(current + quantity, MAX_QUANTITY);
  if (wanted > variant.stock) {
    throw ApiError.conflict(stockMessage(variant.stock), { code: 'OUT_OF_STOCK' });
  }

  await prisma.cartItem.upsert({
    where: { cartId_variantId: { cartId: cart.id, variantId } },
    create: { cartId: cart.id, variantId, quantity: wanted },
    update: { quantity: wanted, savedForLater: false },
  });
  return reload(cart.id);
};

export const updateItem = async (cart, itemId, changes) => {
  const item = cart.items.find((entry) => entry.id === itemId);
  if (!item) throw ApiError.notFound('That item is no longer in your bag.');

  const quantity = changes.quantity ?? item.quantity;
  const savedForLater = changes.savedForLater ?? item.savedForLater;
  if (!savedForLater && quantity > item.variant.stock) {
    throw ApiError.conflict(stockMessage(item.variant.stock), { code: 'OUT_OF_STOCK' });
  }

  await prisma.cartItem.update({ where: { id: itemId }, data: { quantity, savedForLater } });
  return reload(cart.id);
};

export const removeItem = async (cart, itemId) => {
  await prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
  return reload(cart.id);
};

// Called on sign-in / registration: the guest bag follows the customer into their account.
export const mergeGuestCart = async (req, res, customerId) => {
  const token = req.cookies?.[COOKIES.cart];
  if (!token) return;
  const guest = await prisma.cart.findUnique({ where: { token }, include: { items: true } });
  res.clearCookie(COOKIES.cart, { path: '/' });
  if (!guest) return;

  const own = await prisma.cart.findUnique({ where: { customerId }, include: { items: true } });
  if (!own) {
    await prisma.cart.update({ where: { id: guest.id }, data: { customerId, token: null } });
    return;
  }

  const ownVariantIds = new Set(own.items.map((item) => item.variantId));
  const toMove = guest.items.filter((item) => !ownVariantIds.has(item.variantId));
  await prisma.$transaction([
    prisma.cartItem.updateMany({ where: { id: { in: toMove.map((item) => item.id) } }, data: { cartId: own.id } }),
    prisma.cart.delete({ where: { id: guest.id } }),
  ]);
};
