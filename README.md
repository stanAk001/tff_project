# TFF — fashion e-commerce platform

The storefront and admin dashboard for **TFF**: a premium, editorial online store with collections and limited drops, a lookbook, "shop the look", variant-level inventory, Paystack checkout, and a dashboard the owner can run without a developer.

| | |
|---|---|
| **Storefront** | React 19 · Vite · Tailwind CSS 4 · React Router · Motion · Axios |
| **API** | Node.js · Express 5 · ES modules · Zod validation |
| **Database** | PostgreSQL · Prisma ORM |
| **Payments** | Paystack (verified server-side, plus webhook) |
| **Media** | Cloudinary (falls back to local disk in development) |

---

## 1. Quick start

You need **Node.js 20+** and **PostgreSQL 14+** (pgAdmin optional, but supported — see section 2).

```bash
npm run setup                      # installs server + client dependencies

cp server/.env.example server/.env # then edit server/.env (see section 3)

cd server
npx prisma migrate deploy          # creates the tables
npm run db:seed                    # admin account + homepage sections + demo catalogue
cd ..

npm run dev                        # API on :4000 and storefront on :5173
```

Open:

- Storefront → http://localhost:5173
- Admin → http://localhost:5173/admin (sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD` from `server/.env`)

> **This machine is already set up.** The app uses the `tff_project` database on your main PostgreSQL server
> (the one in pgAdmin, port 5432, user `postgres`), with the demo catalogue and media loaded, `server/.env` exists, and the admin login is the `ADMIN_EMAIL` / `ADMIN_PASSWORD` set in that file.
> Change that password in **Admin → Settings → Your password** before sharing access with anyone.

---

## 2. The database and pgAdmin

The app works with any PostgreSQL database. Pick one of these:

### Option A — your own PostgreSQL server (the one already in pgAdmin)

1. In pgAdmin, right-click **Databases → Create → Database…**, name it `tff`, and save.
2. In `server/.env` set:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/tff?schema=public
   ```
   (use the username/password you log into that server with in pgAdmin; if the password contains
   symbols like `@` or `#`, URL-encode them).
3. Create the tables and the starting data:
   ```bash
   cd server
   npx prisma migrate deploy
   npm run db:seed
   ```

### Option B — a private development database

`npm run db:local` starts a separate PostgreSQL instance stored in `.pgdata/` on **port 5433**
(user `tff`, database `tff`, no password, local connections only). It uses the PostgreSQL that is
already installed and creates the database on first run. After restarting your computer, run
`npm run db:local` again before `npm run dev`.

To see it in pgAdmin: **Register → Server…** → General › Name: `TFF (dev)`; Connection › Host: `localhost`,
Port: `5433`, Maintenance database: `tff`, Username: `tff`, Password: leave empty.

### Finding things in pgAdmin

Tables are under **tff → Schemas → public → Tables**. The most useful ones:

| Table | What's in it |
|---|---|
| `Product`, `ProductVariant` | Products; one variant row per colour × size, holding its **stock** |
| `ProductImage`, `ProductVideo` | Media attached to products |
| `Order`, `OrderItem`, `OrderEvent`, `Payment` | Orders, what was bought (copied at purchase), status history, payment |
| `Customer`, `Address`, `WishlistItem`, `Cart`, `CartItem` | Shopper accounts and their saved state |
| `Collection`, `CollectionProduct`, `Category` | Collections/drops and categories |
| `Lookbook`, `LookbookItem`, `LookbookProduct` | Lookbook images and their shoppable markers |
| `HomepageSection`, `HomepageProduct`, `HomepageCollection` | The homepage builder |
| `Discount`, `Review`, `NewsletterSubscriber`, `StockNotification`, `Setting`, `AdminUser` | Everything else |

Prices are stored as **whole naira** (e.g. `45000` = ₦45,000). Prefer making changes through the admin
dashboard — it applies the business rules (stock, notifications, order steps) that direct edits skip.
`npm --prefix server run db:studio` opens Prisma Studio, a browser-based alternative to pgAdmin.

---

## 3. Configuration

All secrets live in `server/.env` (never in the client). See `server/.env.example` for every option.

| Variable | Needed | Notes |
|---|---|---|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `JWT_SECRET` | yes | Long random string — signs login sessions |
| `CLIENT_URL` | yes | Storefront address; used for CORS and payment redirects |
| `SERVER_URL` | yes | API address; used for locally stored uploads |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_NAME` | for seeding | The first admin account, created by `npm run db:seed` |
| `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY` | production | Leave blank in development to use the payment sandbox |
| `CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET` | production | Leave blank to store uploads in `server/uploads/` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` | optional | Without SMTP, emails are printed to the API console |

`client/.env.example` only matters if the storefront and API are deployed on different domains.

### Payments (Paystack)

- **Development without keys:** checkout sends you to `/checkout/sandbox`, a clearly labelled test page where you
  choose "successful" or "failed" payment. The API refuses sandbox requests in production or once keys are set.
- **With keys:** checkout redirects to Paystack. When the customer returns, the server asks Paystack directly
  whether the payment succeeded and checks the amount — the redirect alone is never trusted.
- **Webhook:** in the Paystack dashboard set the webhook URL to `https://YOUR-DOMAIN/api/payments/webhook`.
  Signatures are verified, and handling is idempotent, so a payment is recorded exactly once even if the
  customer closes the tab before returning.

### Stock and overselling

Stock is reserved the moment an order is placed, with an atomic "only if enough is left" update, so two shoppers
can never buy the last piece. If payment fails, or isn't completed within 45 minutes, the order is cancelled and
the stock goes back on sale (a sweep runs every 5 minutes; with Paystack keys set it checks with Paystack first).
Cancelling an order from the admin also restocks it. Restocking a sold-out size emails everyone who asked to be
notified.

---

## 4. Using the admin

Everything is under `/admin`, in plain language for a non-technical owner:

- **Products → Add product** — one page, in order: name and description → photos (drag and drop, reorder,
  tag a photo to a colour) and optional video → price → category and collections → colours and sizes → stock per
  colour/size in a grid → highlights (new, featured, limited, bestseller) → **Preview** → **Publish** (or save a draft).
- **Inventory** — every colour/size with its stock; type a number and press Enter. Low-stock and sold-out tabs.
- **Orders** — open an order and use the single "next step" button: Start preparing → Mark as shipped (optional
  tracking number; the customer is emailed) → Mark as delivered. Every change is recorded in the order history.
- **Collections & drops** — set a drop as *Upcoming* with a launch date: the store shows a live countdown and hides
  the pieces until that moment, then it goes live by itself.
- **Homepage** — switch sections on/off, reorder them, edit text, upload media, choose products, collections and
  the "shop the look" image. Buttons link to pages chosen from a list. The sections, top to bottom by default:
  - **Hero** — full-screen campaign film or photo that opens out of a letterbox frame, the TFF wordmark, your line
    ("Made to stand apart."), and up to two buttons.
  - **Brand statement** — one sentence whose words light up as visitors scroll.
  - **New drop**, **Shop by category**, **Featured products** (a sideways-moving "runway" on computers).
  - **Brand story**, **Shop the look**, **Featured collection** (countdown for upcoming drops).
  - **Campaign banner** — opens from a framed window to full screen as it scrolls in.
  - **Lookbook preview** and **Newsletter signup**.
- **Lookbook** — upload images/films, choose their size on the page, link the pieces worn, and click on the photo
  to place each shoppable marker.
- **Categories** (with a size-guide table editor), **Discounts**, **Reviews** (nothing shows until approved),
  **Newsletter** (CSV download), **Settings** (announcement bar, delivery options and prices, delivery/returns text,
  low-stock level, contact details, your password).

---

## 5. Demo content

`server/prisma/seed-data.js` holds the demo catalogue (16 products, 3 collections including an upcoming drop,
a lookbook, 2 discount codes: `WELCOME10`, `TFF5000`). There are no fake reviews and no fake orders.

**Demo photography and film** are set in `server/prisma/seed-media.js`: photos from Unsplash and films from Mixkit,
both free for commercial use (unsplash.com/license, mixkit.co/license) and loaded from their CDNs. Every product,
category, collection, lookbook image and the homepage hero, brand story and campaign banner has media. Replace any of
it from the admin; `npm --prefix server run db:seed-media` fills only spaces that are still empty, so it never
overwrites your uploads. Swap in TFF's own photography before launch — stock images aren't exclusive to the brand.

**Upgrading a database from before the October 2026 redesign:** run `npx prisma migrate deploy` (adds the
brand-statement section type) and then `node prisma/upgrade-homepage.js` in `server/`. It adds the brand statement
after the hero and applies the "Made to stand apart" copy only where the old demo wording is still in place.

To start a fresh database with **no demo products**: `SEED_DEMO=false npm run db:seed`
(in Windows PowerShell: `$env:SEED_DEMO='false'; npm run db:seed`). This still creates the
admin account and the homepage section rows the builder needs. On an existing database, delete or archive demo
products from **Admin → Products**.

---

## 6. Project structure

```
client/                     storefront + admin (one Vite app; the admin is a separate, lazily loaded bundle)
  src/admin/                dashboard: AdminApp, components/ (tables, uploader, pickers), pages/
  src/components/           ui/ (Button, Modal, Media, Field, Reveal…), layout/, product/, home/, shop/
  src/context/              shopper state (account, bag, wishlist, settings) and toasts
  src/hooks/  src/pages/  src/services/api.js  src/utils/
  src/index.css             design tokens — colours and typefaces are set once here
server/
  prisma/                   schema.prisma, migrations/, seed.js, seed-data.js (demo content)
  src/config/  middleware/  routes/  controllers/  services/  utils/
  scripts/api-check.js      end-to-end API check (npm run check:api)
scripts/                    dev.mjs (runs both apps), local-db.mjs (optional dev database)
```

API responses always look like `{ success: true, data, meta? }` or `{ success: false, error: { message, code, details? } }`.
Public routes live under `/api/*`; everything under `/api/admin/*` requires an admin session.

---

## 7. Checking that it works

- `npm run check:api` (with the API running) — 79 end-to-end checks: catalogue, filters and search, bag, accounts,
  stock reservation and release, payments (success, failure, double confirmation), order tracking and privacy,
  reviews, notify-me, admin access control, product create/edit/archive/delete, order steps. With Paystack keys set
  it creates real Paystack test transactions, asks Paystack for their status, and confirms or declines them with
  webhooks signed by your secret key (and checks a forged one is rejected). Without keys it uses the sandbox. It
  removes everything it created when it finishes — even if a step crashes. Use **test** keys only.
- `npm run build` must finish without errors.
- `npm run build` must finish without errors.

---

## 8. Deploying

The simplest setup is a single service: build the storefront, then run the API, which serves the built site too.

```bash
npm run setup
npm run build                         # creates client/dist
cd server && npx prisma migrate deploy && npm run db:seed
NODE_ENV=production npm start         # serves the API and the storefront
```

In production the server also writes each product and collection page's title, description, canonical URL and
social-sharing image into the HTML, so link previews and search engines see the right details. `/sitemap.xml`
and `/robots.txt` are generated from the live catalogue.

Production checklist: real `JWT_SECRET`; Paystack live keys and webhook; Cloudinary keys (local-disk uploads do
not survive redeploys on most hosts); SMTP for order emails; HTTPS (cookies are marked `Secure` in production);
`CLIENT_URL` and `SERVER_URL` set to your domain; a strong admin password.

---

## 9. Known limits

- **Live services:** Paystack (test keys) and Cloudinary have been exercised: checkout creates real Paystack payment
  pages, Paystack's status lookups work, and admin uploads land in Cloudinary and are served resized. Not yet done:
  completing a card payment on Paystack's own page (it shows a bot check to automated browsers, so it needs a human —
  use Paystack's test card), registering the webhook URL in the Paystack dashboard once the site has a public
  address, and email (SMTP is not configured, so emails are printed to the API console).
- There is one admin role. Further admin accounts can be added by changing `ADMIN_EMAIL`/`ADMIN_PASSWORD` and running
  `npm run db:seed` again (existing data is left untouched).
- Refunds are made in the Paystack dashboard; cancelling a paid order in the admin restocks it and reminds you to refund.
- Customers can't reset a forgotten password yet (that needs email to be configured first).
# tff_project
# tff_project
