import { prisma } from '../config/prisma.js';
import { ApiError } from '../utils/ApiError.js';
import { COOKIES, verifyToken } from '../utils/tokens.js';

// Sets req.customerId when a valid customer session cookie is present. Never rejects.
export const attachCustomer = (req, _res, next) => {
  const token = req.cookies?.[COOKIES.customer];
  req.customerId = token ? verifyToken(token, 'customer') : null;
  next();
};

export const requireCustomer = (req, _res, next) => {
  if (!req.customerId) throw ApiError.unauthorized();
  next();
};

export const requireAdmin = async (req, _res, next) => {
  const token = req.cookies?.[COOKIES.admin];
  const adminId = token ? verifyToken(token, 'admin') : null;
  if (!adminId) throw ApiError.unauthorized('Admin sign-in required.');

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true },
  });
  if (!admin) throw ApiError.unauthorized('Admin sign-in required.');

  req.admin = admin;
  next();
};
