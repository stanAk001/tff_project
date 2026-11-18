import { z } from 'zod';

// Shared building blocks for request validation.

export const idParam = z.object({ id: z.string().min(1).max(40) });
export const slugParam = z.object({ slug: z.string().min(1).max(100) });

export const pagination = (defaultLimit = 24, maxLimit = 60) => ({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
});

export const email = z.string().trim().toLowerCase().email('Enter a valid email address.').max(160);
export const text = (max = 200) => z.string().trim().max(max);
export const requiredText = (label, max = 200) => z.string().trim().min(1, `${label} is required.`).max(max);
export const optionalText = (max = 200) => z.string().trim().max(max).nullish().or(z.literal(''));
export const money = z.coerce.number().int('Use whole naira amounts.').min(0).max(100_000_000);

// Media URLs come from our own upload endpoint; anything else must at least be http(s).
export const mediaUrl = z
  .string()
  .trim()
  .max(600)
  .refine((value) => value === '' || /^https?:\/\//i.test(value), 'Media must be an uploaded file.')
  .nullish();

// "a,b,c" → ["a","b","c"]
export const csv = z
  .string()
  .max(400)
  .optional()
  .transform((value) => (value ? value.split(',').map((part) => part.trim()).filter(Boolean) : []));

export const flag = z
  .enum(['true', 'false', '1', '0'])
  .optional()
  .transform((value) => value === 'true' || value === '1');
