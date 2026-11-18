import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({
  // Checkout reserves stock for every line in one transaction — give it room
  transactionOptions: { maxWait: 5000, timeout: 15000 },
});
