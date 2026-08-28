# fruit-poc

Minimal Next.js app: one page that calls one API route. Proves out the
"frontend + backend in one repo, deployed to Vercel" pattern for future POCs.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the page shows "Hello, world" plus a message
fetched from `/api/fruit`, so you know both halves work.

Open http://localhost:3000/fruitisimo for the Fruitisimo closing POC
component (`components/FruitisimoClosingPOC.jsx`). It's a plain `.jsx`
file (no TypeScript) — Next.js compiles it right alongside the `.tsx`
files, no extra config needed beyond what's already in this repo
(Tailwind + lucide-react were added specifically for this component).

## Deploy to Vercel (free)

1. Push this folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "fruit poc"
   git branch -M main
   git remote add origin <your-repo-url>
   git push -u origin main
   ```
2. Go to https://vercel.com, sign in with GitHub, click "Add New Project",
   pick this repo, click Deploy. No config needed — Vercel auto-detects
   Next.js.
3. You'll get a live `https://fruit-poc-xxxx.vercel.app` URL in ~1 minute.
4. (Optional) Add a custom domain under Project Settings → Domains.

Every future push to `main` auto-redeploys.
