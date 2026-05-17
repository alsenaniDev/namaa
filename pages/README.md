# Namaa — Public Pages

Two static HTML pages required by the Apple App Store submission:

- `support.html` — Support page (Arabic + English) with FAQ and contact email.
- `privacy.html` — Privacy Policy page (Arabic + English).

Both pages reference contact email: **alsenanimohammed1@gmail.com**

## How to host (fastest option: GitHub Pages, free, takes 3 minutes)

1. Create a new public GitHub repo, e.g. `namaa-pages`.
2. Upload `support.html` and `privacy.html` into the repo root.
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
open pages/support.html
open pages/privacy.html
```
