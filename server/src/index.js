import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';
import { expireStaleOrders } from './services/order.service.js';
import { confirmUnpaid, sandboxEnabled } from './services/payment.service.js';

const server = app.listen(env.port, () => {
  console.log(`TFF API listening on http://localhost:${env.port}`);
  if (sandboxEnabled) {
    console.log('Paystack keys not set — using the development payment sandbox.');
  }
});

// Every few minutes, give stock back from checkouts that were never paid for.
const SWEEP_INTERVAL = 5 * 60 * 1000;
const sweep = setInterval(() => {
  expireStaleOrders(confirmUnpaid).catch((error) => console.error('[orders] Sweep failed:', error.message));
}, SWEEP_INTERVAL);
sweep.unref();

const shutdown = async () => {
  clearInterval(sweep);
  server.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
