# BAYBREEZE Business OS

A full business management app for a jaadi (bottled fish / seafood) production business — POS, production batches, stock, purchases, wholesale, customers, expenses, payments, reports and an AI assistant, all in one page. Built as plain HTML/CSS/JS (no build step), with [Supabase](https://supabase.com) as the realtime database.

## Project structure

```
index.html              Page shell — loads css/js, has the login screen
manifest.webmanifest     Installable app metadata
css/styles.css           All styling
js/config.js              Where you paste your Supabase URL + key
js/app.js                 App shell: auth, routing, navigation, search
js/core/                  Shared code
  store.js                 Talks to Supabase (or demo/local storage if not connected)
  cache.js                 Keeps each table's data live in memory via Realtime
  crud.js                  Generic list + detail + form builder used by most tabs
  ui.js                    Small helpers: formatting, modals, toasts, tables, charts
  routes.js                The list of tabs/modules and their labels (English + Sinhala)
  seed.js                  Sample data used in demo mode
js/modules/               One file per tab (dashboard.js, pos.js, products.js, …)
supabase/schema.sql       Run this once in Supabase to create all tables
.github/workflows/deploy.yml   Auto-deploys to GitHub Pages on every push to main
```

Each tab is its own small JavaScript file and is only downloaded when you open that tab, so the app starts fast even though it has 20+ modules.

## Running it locally

No build step needed. From this folder:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`. (Opening `index.html` directly by double-clicking will not work — the browser blocks JS modules on the `file://` protocol.)

The first account you sign up with becomes the **Owner**. Everyone who signs up after that starts as **Cashier**; the Owner can change roles under **Staff**.

## Demo mode vs. connected mode

- **Without Supabase connected:** the app runs in demo mode. Data is saved only in your browser (`localStorage`), pre-loaded with sample BAYBREEZE data. Good for trying it out, but data does not sync between devices.
- **With Supabase connected:** every tab is realtime — a change made on one phone or computer appears instantly on every other one that's open, for every signed-in user.

## Connecting Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In your project, open **SQL Editor → New query**, paste the contents of `supabase/schema.sql`, and run it. This creates every table the app needs, sets up security rules, and turns on Realtime.
3. In your project, open **Settings → API** and copy the **Project URL** and the **`anon` public key**.
4. Either:
   - Paste them into `js/config.js` before deploying (permanent, same for everyone), **or**
   - Sign in to the app, go to **Settings** (inside the app), and paste them there (saved to your browser, easiest for testing).
5. Never paste the **`service_role`** key anywhere in this app — only the public **`anon`** key. Row Level Security in `schema.sql` is what keeps the anon key safe to use in a browser.

## Deploying to GitHub Pages

1. Create a new GitHub repository and push this folder to the `main` branch:
   ```bash
   cd baybreeze-os
   git init
   git add .
   git commit -m "BAYBREEZE Business OS"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
2. In the repository on GitHub: **Settings → Pages → Source → GitHub Actions**.
3. The included workflow (`.github/workflows/deploy.yml`) will build and publish automatically on every push to `main`. Your site will be live at `https://<your-username>.github.io/<your-repo>/`.
4. If you put your Supabase URL/key into `js/config.js` before pushing, every visitor connects automatically. Otherwise, each person can paste their own in the in-app Settings tab.

## Roles

| Role | Typical use |
|---|---|
| Owner | Full access, including Staff and Settings (data connection) |
| Manager | Day-to-day operations |
| Cashier | POS and sales-facing tabs |
| Production | Production and stock tabs |

(The app currently shows all tabs to every signed-in user and enforces role-specific actions like Staff management; tighten `supabase/schema.sql`'s Row Level Security policies further if you need per-role database-level restrictions.)

## Modules / tabs

Dashboard · POS/Sales · Products · Recipes/BOM · Production · Inventory · Raw Materials · Packaging · Purchases · Suppliers · Customers · Wholesale · Returns · Wastage · Expenses · Payments · Reports · Profit Analytics · Business Intelligence · AI Assistant · Staff · Settings · Backup & Audit
