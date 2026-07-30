# Namaa — Public Website

Static website for the Namaa app:

- `index.html` — Professional animated landing page with real app screenshots, a floating phone mockup, an auto-scrolling screens carousel, and scroll-reveal animations.
- `support.html` — Support page (Arabic + English) with FAQ and contact email.
- `privacy.html` — Privacy Policy page (Arabic + English).
- `styles.css` — Shared website styling (modern theme + animations).
- `app.js` — Landing page interactions (scroll reveal, sticky header, counters, subtle parallax).
- `assets/` — Real app screenshots (`home.jpeg`, `reports.jpeg`, `commitments.jpeg`, `expenses.jpeg`, `income.jpeg`, `payoff-plan.jpeg`, `achievements.jpeg`, `financial-challenges.jpeg`, `what-if.jpeg`, `settings.jpeg`, `home_2.jpeg`) and `logo.jpeg`.

Both pages reference contact email: **alsenanimohammed1@gmail.com**

Store buttons currently use `href="#"`. Replace those placeholders with the real App Store and Google Play URLs when the app listings are live.

## How to host (fastest option: GitHub Pages, free, takes 3 minutes)

1. Create a new public GitHub repo, e.g. `namaa-pages`.
2. Upload the full `docs/` contents into the repo root.
3. In the repo: **Settings → Pages → Source: Deploy from a branch → Branch: `main` / root → Save**.
4. After ~1 minute GitHub will publish the site at:
   - `https://<your-username>.github.io/namaa-pages/support.html`
   - `https://<your-username>.github.io/namaa-pages/privacy.html`
5. Paste those URLs into App Store Connect:
   - **Support URL** → the support.html URL
   - **Privacy Policy URL** → the privacy.html URL

## Alternative hosts (all free)

- **Netlify Drop** — drag the `pages/` folder onto https://app.netlify.com/drop, get instant URLs.
- **Vercel** — push to GitHub then import the repo on vercel.com.
- **Cloudflare Pages** — connect a GitHub repo.

## Preview locally

Open the files directly in a browser:

```
open docs/index.html
open docs/support.html
open docs/privacy.html
```
