# YepIts.ai

Turn any YouTube video into a 2-minute read.

## Quick Start (Local)

### Terminal 1 — Backend
```bash
cd server
npm install
npm run dev
```

### Terminal 2 — Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Deploy to Railway

1. Root directory = `server/`
2. Build command: `npm run build` (builds frontend into frontend/dist)
3. Start command: `npm start`
4. Env vars:
   - `ANTHROPIC_API_KEY`
   - `JWT_SECRET`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_PRICE_ID`
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `FROM_EMAIL` (optional; defaults to `YepIts.ai <pava@yepits.ai>`)
   - `APP_URL` (optional; defaults to production URL)
   - `CORS_ORIGINS` (optional; comma-separated, defaults to `https://yepits.ai,http://localhost:5173`)
   - `NODE_ENV=production`
5. Point yepits.ai domain to the Railway service
