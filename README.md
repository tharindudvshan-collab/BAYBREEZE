# BAYBREEZE Business OS — App Structure

Now split into a proper multi-file app with a login gate and offline support (PWA).

```
index.html      → dashboard/POS page markup (loads style.css + app.js)
style.css       → all app styling
app.js          → auth guard + service worker registration + dashboard/POS logic
login.html      → sign-in page markup
login.css       → sign-in page styling
login.js        → sign-in logic (demo credentials, see below)
sw.js           → service worker (caches the app shell for offline use)
manifest.json   → PWA manifest (lets it be "installed" to a phone home screen)
.github/workflows/deploy.yml → auto-deploys to GitHub Pages on every push to main
```

## How it works
- Opening `index.html` directly checks `sessionStorage` for a login flag. If missing, it redirects to `login.html`.
- **Demo login:** username `owner`, password `1234` (set in `login.js` — change these before real use, and swap in a real backend check).
- After login, `app.js` registers `sw.js`, which caches the app shell so it still opens (with the last-loaded screen) without internet.
- The "⎋ Log out" button in the top header clears the session and sends you back to `login.html`.

## Deploy — GitHub Pages (auto, recommended)
1. Push this whole folder to a GitHub repo, `main` branch.
2. Go to repo **Settings → Pages** → set Source to **GitHub Actions** (one-time).
3. Every future push to `main` auto-deploys via `.github/workflows/deploy.yml`.
4. Your app is live at `https://<username>.github.io/<repo>/`.

## Deploy — Netlify / Vercel (drag & drop)
Drag this whole folder into https://app.netlify.com/drop or https://vercel.com/new — no config needed, it's already a static site.

## Notes
- This is demo-data only; no real backend. Login is client-side only — good for a prototype/demo, not for production security.
- To change the login credentials, edit `USER`/`PASS` at the top of `login.js`.
