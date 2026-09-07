# Fruitisimo Closing App

Replaces the phone-calculator + mental-math part of Fruitisimo's register
closing: weigh a product, subtract the container tare, apply the peeled-fruit
multiplier, count the accessories, and get one item → total summary to copy
into the Czech system.

Planning docs live in [`docs/`](docs/) — start with
`fruitisimo-app-plan.md` (architecture + decisions) and
`fruitisimo-phase1-plan.md` (the step-by-step build order).

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript + Tailwind 4.
- `app/` — pages; `app/api/*` — route handlers (the backend). One project,
  one deploy.
- No database. Config lives in JSON in the repo; the in-progress closing lives
  in the browser's localStorage.
- UI text in English, product/container names in Hungarian as Fruitisimo
  writes them.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

The page shows whether `GET /api/health` succeeded, which proves the UI and
the API halves are talking to each other.

```bash
npm run build      # production build
npm start          # serve the production build
npm run typecheck  # tsc --noEmit
```

## Deploy (Vercel, free tier)

Vercel auto-detects Next.js — import the repo at vercel.com and deploy, no
config needed. Every push to `main` redeploys.

Pages are served static from the CDN and only `app/api/*` runs as serverless
functions, so there's no idle cold start.

## Status

Phase 1, Step 1 (scaffolding + deploy pipeline) — the app is an empty skeleton
with a health check. Real config, calculation, and entry flows come next.
