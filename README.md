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
npm test           # vitest: the closing math in lib/calc.test.ts
```

## Deploy (Vercel, free tier)

Vercel auto-detects Next.js — import the repo at vercel.com and deploy, no
config needed. Every push to `main` redeploys.

Pages are served static from the CDN and only `app/api/*` runs as serverless
functions, so there's no idle cold start.

## Config

`config/products.json` and `config/containers.json` hold Fruitisimo's real
products, tare weights, peeled-fruit multipliers, and accessory pack sizes,
transcribed from `docs/`. Edit those files to change the app's data — no code
change needed. `lib/config.ts` types and validates them — duplicate ids, unknown groups,
multipliers below 1, pack sizes out of order and similar all throw, which
**fails the build**, so a bad edit can't reach production. `GET /api/config`
serves them to the client.

## The math

`lib/calc.ts` is the closing arithmetic, deliberately free of any UI: tare
comes off first, the peeled-fruit multiplier after (`net = (raw - tare) *
multiplier`), everything computed in grams and rounded to the nearest gram.
`lib/calc.test.ts` pins it to hand-checked examples taken from the real
config — run `npm test`.

## Status

Phase 1, Steps 1-4 done: scaffolding, real config, the tested calculation
engine, and the closing screen (Daily/Weekly/Monthly switcher + grouped
product list, following `design/fruitisimo-closing/`). The entry flow, session
persistence, and xlsx export come next.
