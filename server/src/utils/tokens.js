import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export const COOKIES = {
  customer: 'tff_token',
  admin: 'tff_admin',
  cart: 'tff_cart',
};

const WEEK = 7 * 24 * 60 * 60 * 1000;

export const cookieOptions = (maxAge = WEEK) => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge,
});

export const signToken = (subject, type) =>
  jwt.sign({ type }, env.jwtSecret, { subject, expiresIn: env.jwtExpiresIn });

export const verifyToken = (token, type) => {
  try {
    const payload = jwt.verify(token, env.jwtSecret);
    return payload.type === type ? payload.sub : null;
  } catch {
    return null;
  }
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const randomCode = (length) =>
  Array.from(crypto.randomBytes(length), (byte) => ALPHABET[byte % ALPHABET.length]).join('');

export const newOrderNumber = () => `TFF-${randomCode(8)}`;
export const newPaymentReference = (orderNumber) => `${orderNumber}-${randomCode(6)}`;
export const newCartToken = () => crypto.randomBytes(24).toString('hex');
