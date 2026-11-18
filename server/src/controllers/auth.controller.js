import bcrypt from 'bcryptjs';
import { prisma } from '../config/prisma.js';
import { mergeGuestCart } from '../services/cart.service.js';
import { ApiError } from '../utils/ApiError.js';
import { created, ok } from '../utils/respond.js';
import { COOKIES, cookieOptions, signToken } from '../utils/tokens.js';

const customerSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  createdAt: true,
  addresses: { where: { isDefault: true }, take: 1 },
};

const present = ({ addresses, ...customer }) => ({ ...customer, defaultAddress: addresses?.[0] || null });

// Same wording for "no such account" and "wrong password" so accounts can't be probed.
const BAD_LOGIN = 'That email and password don’t match.';
// Compared against when the account doesn't exist, so response time doesn't reveal it.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);

export const register = async (req, res) => {
  const { email, password, firstName, lastName } = req.valid.body;

  const exists = await prisma.customer.findUnique({ where: { email }, select: { id: true } });
  if (exists) throw ApiError.conflict('An account with that email already exists. Try signing in.');

  const customer = await prisma.customer.create({
    data: { email, firstName, lastName, passwordHash: await bcrypt.hash(password, 12) },
    select: customerSelect,
  });

  await mergeGuestCart(req, res, customer.id);
  res.cookie(COOKIES.customer, signToken(customer.id, 'customer'), cookieOptions());
  created(res, present(customer));
};

export const login = async (req, res) => {
  const { email, password } = req.valid.body;

  const account = await prisma.customer.findUnique({ where: { email } });
  const matches = await bcrypt.compare(password, account?.passwordHash || DUMMY_HASH);
  if (!account || !matches) throw ApiError.unauthorized(BAD_LOGIN);

  await mergeGuestCart(req, res, account.id);
  res.cookie(COOKIES.customer, signToken(account.id, 'customer'), cookieOptions());

  const customer = await prisma.customer.findUnique({ where: { id: account.id }, select: customerSelect });
  ok(res, present(customer));
};

export const logout = (_req, res) => {
  res.clearCookie(COOKIES.customer, { path: '/' });
  ok(res);
};

export const me = async (req, res) => {
  if (!req.customerId) return ok(res, null);
  const customer = await prisma.customer.findUnique({ where: { id: req.customerId }, select: customerSelect });
  ok(res, customer ? present(customer) : null);
};

export const updateMe = async (req, res) => {
  const { firstName, lastName, phone, currentPassword, newPassword } = req.valid.body;
  const data = { firstName, lastName, phone: phone || null };

  if (newPassword) {
    const account = await prisma.customer.findUnique({ where: { id: req.customerId } });
    const matches = await bcrypt.compare(currentPassword || '', account.passwordHash);
    if (!matches) throw ApiError.badRequest('Your current password isn’t right.');
    data.passwordHash = await bcrypt.hash(newPassword, 12);
  }

  const customer = await prisma.customer.update({ where: { id: req.customerId }, data, select: customerSelect });
  ok(res, present(customer));
};

// ── Admin ────────────────────────────────────────────────────────────────

export const adminLogin = async (req, res) => {
  const { email, password } = req.valid.body;
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  const matches = await bcrypt.compare(password, admin?.passwordHash || DUMMY_HASH);
  if (!admin || !matches) throw ApiError.unauthorized(BAD_LOGIN);

  res.cookie(COOKIES.admin, signToken(admin.id, 'admin'), cookieOptions());
  ok(res, { id: admin.id, email: admin.email, name: admin.name });
};

export const adminLogout = (_req, res) => {
  res.clearCookie(COOKIES.admin, { path: '/' });
  ok(res);
};

export const adminMe = (req, res) => ok(res, req.admin);

export const adminChangePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const admin = await prisma.adminUser.findUnique({ where: { id: req.admin.id } });
  if (!(await bcrypt.compare(currentPassword, admin.passwordHash))) {
    throw ApiError.badRequest('Your current password isn’t right.');
  }
  await prisma.adminUser.update({
    where: { id: admin.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  ok(res);
};
