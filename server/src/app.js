import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { attachCustomer } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import { apiLimiter } from './middleware/rateLimit.js';
import adminRoutes from './routes/admin.routes.js';
import authRoutes from './routes/auth.routes.js';
import cartRoutes from './routes/cart.routes.js';
import catalogRoutes from './routes/catalog.routes.js';
import engagementRoutes from './routes/engagement.routes.js';
import orderRoutes from './routes/order.routes.js';
import { UPLOAD_DIR } from './services/media.service.js';
import { buildRobots, buildSitemap, injectMeta } from './services/seo.service.js';

const app = express();

// Behind a host's proxy (Render, Railway, Nginx…) this makes rate limiting and secure cookies work
app.set('trust proxy', 1);
app.disable('x-powered-by');

app.use(
  helmet({
    // Media is served to the storefront on another origin in development
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env.isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            // Unsplash and Mixkit host the demo photography and film until it is replaced
            imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com', 'https://images.unsplash.com', 'https://assets.mixkit.co'],
            mediaSrc: ["'self'", 'blob:', 'https://res.cloudinary.com', 'https://assets.mixkit.co'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'"],
          },
        }
      : false,
  }),
);
app.use(cors({ origin: env.clientUrl, credentials: true }));
app.use(compression());
// The raw body is kept so the Paystack webhook signature can be checked
app.use(
  express.json({
    limit: '1mb',
    verify: (req, _res, buffer) => {
      if (req.originalUrl.startsWith('/api/payments/webhook')) req.rawBody = buffer;
    },
  }),
);
app.use(cookieParser());

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '30d', immutable: true }));

app.get('/sitemap.xml', async (_req, res) => {
  res.type('application/xml').send(await buildSitemap());
});
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(buildRobots());
});

// ── API ──────────────────────────────────────────────────────────────────

const api = express.Router();
api.use(apiLimiter);
api.get('/health', (_req, res) => res.json({ success: true, data: { status: 'ok' } }));
api.use('/admin', adminRoutes);
api.use(attachCustomer);
api.use('/auth', authRoutes);
api.use(catalogRoutes);
api.use(cartRoutes);
api.use(orderRoutes);
api.use(engagementRoutes);
api.use(notFound);

app.use('/api', api);

// ── Storefront (production) ──────────────────────────────────────────────
// When the client has been built, this server also serves it, so the whole
// site can run as a single service.

const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const indexFile = path.join(clientDist, 'index.html');

if (fs.existsSync(indexFile)) {
  const indexHtml = fs.readFileSync(indexFile, 'utf8');
  app.use(express.static(clientDist, { index: false, maxAge: '1y', immutable: true }));
  app.get('/{*path}', async (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.type('html').send(await injectMeta(indexHtml, req.path));
  });
} else {
  app.use(notFound);
}

app.use(errorHandler);

export default app;
