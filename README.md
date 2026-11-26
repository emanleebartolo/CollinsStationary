# Collins Stationery Rabat — Cloudflare Pages + D1 starter

This project contains:
- Public storefront (HTML/CSS/JS)
- Separate staff portal at `/admin.html`
- Cloudflare Pages Functions API under `/functions/api`
- Cloudflare D1 schema/migration
- `admin` and `owner` roles

## Important scope and safety

This is a backend-enabled starter, not a finished live-payment shop. It provides real authentication and shared product records once D1 is configured. The public checkout remains a demonstration and does **not** create paid orders. The live D1 product catalogue starts empty until an administrator adds the shop's actual products.

Card payments, verified payment webhooks, customer order creation, order fulfilment workflow, password reset, audit logs, backups and a production security review still need to be completed before taking real orders.

### Roles
- **Administrator**: add, edit and remove products; update catalogue details, prices and stock; create staff accounts.
- **Owner**: update product prices and stock only; view orders.
- **Public visitors**: read active products.

Passwords are stored as PBKDF2-SHA256 hashes with unique salts. Login sessions use random tokens stored as SHA-256 hashes and an HttpOnly, Secure, SameSite cookie. Failed sign-in attempts are throttled using D1 records.

## 1. Extract and upload the project to GitHub

Extract this ZIP. Upload **all files and folders** to the root of your existing `collins-stationery` GitHub repository. Keep the `functions` and `migrations` folders at the repository root.

The project should have `index.html`, `styles.css`, `script.js`, `admin.html`, `admin.css`, `admin.js`, `functions/`, `migrations/` and `wrangler.jsonc` at the top level.

## 2. Create Cloudflare D1 database

Install/use Wrangler from a terminal in the project folder:

```bash
npx wrangler login
npx wrangler d1 create collins-stationery-db
```

Copy the returned database ID into `wrangler.jsonc`, replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Apply the database schema:

```bash
npx wrangler d1 migrations apply collins-stationery-db --remote
```

## 3. Set the one-time administrator setup secret

Choose a long, random secret and run:

```bash
npx wrangler pages secret put SETUP_SECRET --project-name collins-stationery
```

Paste the secret when prompted. Do not put it in GitHub, `index.html`, or any frontend file.

## 4. Cloudflare Pages settings

Connect the GitHub repository to your Cloudflare Pages project. Because this project includes `wrangler.jsonc`, keep its settings aligned with the Cloudflare Pages project.

- Framework preset: None
- Build command: leave blank (or `exit 0` if the dashboard requires a command)
- Build output directory: `./`
- Root directory: `/`

The `wrangler.jsonc` file configures the D1 binding as `DB`. If you change the binding in the Cloudflare dashboard instead, keep the Wrangler configuration in sync; a Wrangler configuration file is the source of truth for configured Pages settings.

Commit and push the project. Cloudflare Pages will deploy the site and its Functions.

## 5. Create the first administrator

After deployment, open:

`https://YOUR-SITE.pages.dev/admin.html`

Choose **First-time setup**, enter the exact `SETUP_SECRET` configured in Cloudflare, then create the administrator username and a strong password (12+ characters).

The setup endpoint becomes unavailable after the first user has been created.

## 6. Create the shop owner's account

Sign in as administrator. Open **Staff accounts** and create an `Owner – prices and stock` account. Share the login details securely.

## 7. Add products

The administrator can add products, edit their catalogue details, update prices and stock, and remove products from the online catalogue. The owner account can update prices and stock only. The public storefront reads active products from `/api/products`.

## Before real launch

1. Integrate a payment provider suitable for the business and region. Never collect or store card details directly.
2. Add a payment webhook that verifies provider signatures before marking orders paid.
3. Add a transactional checkout API that checks stock and creates orders and order items atomically.
4. Add email notifications and delivery/collection workflow.
5. Add password reset, audit logs, backups and a security review.
6. Add privacy, returns, delivery, terms and contact information appropriate to the shop.
