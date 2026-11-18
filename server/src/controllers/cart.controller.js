import { prisma } from '../config/prisma.js';
import * as carts from '../services/cart.service.js';
import { cardInclude, toCard } from '../services/product.service.js';
import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/respond.js';

// ── Bag ──────────────────────────────────────────────────────────────────

export const getCart = async (req, res) => ok(res, carts.serializeCart(await carts.findCart(req)));

export const addItem = async (req, res) => {
  const { variantId, quantity } = req.valid.body;
  const cart = await carts.ensureCart(req, res);
  ok(res, carts.serializeCart(await carts.addItem(cart, variantId, quantity)));
};

export const updateItem = async (req, res) => {
  const cart = await carts.findCart(req);
  if (!cart) throw ApiError.notFound('Your bag is empty.');
  ok(res, carts.serializeCart(await carts.updateItem(cart, req.valid.params.id, req.valid.body)));
};

export const removeItem = async (req, res) => {
  const cart = await carts.findCart(req);
  if (!cart) return ok(res, carts.serializeCart(null));
  ok(res, carts.serializeCart(await carts.removeItem(cart, req.valid.params.id)));
};

// ── Wishlist ─────────────────────────────────────────────────────────────

const wishlistFor = async (customerId) => {
  const rows = await prisma.wishlistItem.findMany({
    where: { customerId, product: { status: 'PUBLISHED' } },
    orderBy: { createdAt: 'desc' },
    include: { product: { include: cardInclude } },
  });
  return rows.map((row) => toCard(row.product));
};

export const getWishlist = async (req, res) => ok(res, await wishlistFor(req.customerId));

export const addToWishlist = async (req, res) => {
  const { productId } = req.valid.body;
  const product = await prisma.product.findFirst({ where: { id: productId, status: 'PUBLISHED' }, select: { id: true } });
  if (!product) throw ApiError.notFound('That piece is no longer available.');

  await prisma.wishlistItem.upsert({
    where: { customerId_productId: { customerId: req.customerId, productId } },
    create: { customerId: req.customerId, productId },
    update: {},
  });
  ok(res, await wishlistFor(req.customerId));
};

export const removeFromWishlist = async (req, res) => {
  await prisma.wishlistItem.deleteMany({ where: { customerId: req.customerId, productId: req.valid.params.id } });
  ok(res, await wishlistFor(req.customerId));
};
