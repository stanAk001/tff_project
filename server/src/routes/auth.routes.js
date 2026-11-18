import { Router } from 'express';
import { z } from 'zod';
import * as auth from '../controllers/auth.controller.js';
import { requireCustomer } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { email, optionalText, requiredText } from '../utils/schemas.js';

const password = z.string().min(8, 'Use at least 8 characters.').max(100);

const registerBody = z.object({
  email,
  password,
  firstName: requiredText('First name', 60),
  lastName: requiredText('Last name', 60),
});

const loginBody = z.object({ email, password: z.string().min(1, 'Enter your password.').max(100) });

const updateBody = z
  .object({
    firstName: requiredText('First name', 60),
    lastName: requiredText('Last name', 60),
    phone: optionalText(30),
    currentPassword: z.string().max(100).optional(),
    newPassword: password.optional().or(z.literal('')),
  })
  .refine((body) => !body.newPassword || body.currentPassword, {
    message: 'Enter your current password to set a new one.',
    path: ['currentPassword'],
  });

const router = Router();

router.post('/register', authLimiter, validate({ body: registerBody }), auth.register);
router.post('/login', authLimiter, validate({ body: loginBody }), auth.login);
router.post('/logout', auth.logout);
router.get('/me', auth.me);
router.patch('/me', requireCustomer, validate({ body: updateBody }), auth.updateMe);

export default router;
