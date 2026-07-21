# LiveAffiliate

TikTok Live affiliate management — scheduling, AI-read live results, ad reporting.

## Roles

| Role | Can do |
|---|---|
| **Affiliate** | Manage up to 4 TikTok profile links, schedule lives (Asia/Kuala_Lumpur), upload the live recap screenshot (auto-read by AI), post PeningLab videos and record the TikTok link |
| **Marketer** | Dashboard, list/pending/success/posting/reporting for assigned affiliates, set ad budgets, bulk-import LIVE analytics, import Product GMV `.xlsx`, import Overall GMV-Max screenshots |
| **Admin** | Assign affiliates to marketers, see all reporting, set the GRSAI key/model |

## AI extraction

Screenshots are read with **Gemini 2.5 Flash via GRSAI** (OpenAI-compatible `/chat/completions`, base must end in `/v1`):

- **Live recap** → GMV, viewers, items sold, duration, live title
- **Bulk LIVE analytics table** → per-row name/date/time/duration + Spend, Gross Revenue, ROI; matched to pending lives by name + date + duration + closest time. Unmatched rows land in *Unknown Affiliate*.
- **Overall GMV-Max** → Overview panel (Cost, SKU orders, Cost/order, Gross revenue, ROI) + Key metrics panel (GMV, Visitors, Impressions, Clicks)

A live moves **Pending → Success** only when it has **Budget + Spend + Gross Revenue + ROI**.

## PeningLab ingest

PeningLab pushes finished videos straight into an affiliate's *Pending Post*:

```
POST /api/posts/ingest
Authorization: Bearer <INGEST_API_KEY>

{
  "email": "affiliate@example.com",
  "output_url": "https://.../video.mp4",
  "caption": "…",
  "metadata": {
    "cover_title": "RAMAI BELI?",
    "cover_subtitle": "PATUTLAH RAMBUT DAH TAK GUGUR",
    "cover_thumbnail_url": "https://.../cover.png"
  },
  "date": "2026-07-21",
  "source_id": "peninglab-history-id"
}
```

`date` defaults to today (KL). `source_id` makes retries idempotent. The post starts
`pending`; when the affiliate saves the TikTok link it moves to *Done Post*.

## Local development

```bash
npm install
cp .env.example .env.local   # fill in the values
npm run dev                  # http://localhost:3005
```

Storage is **SQLite via Node's built-in `node:sqlite`** (`data/app.db`) — no native build step.

## Deploying

> **Before deploying to Vercel** the data layer must move off local SQLite:
> Vercel's filesystem is ephemeral, so `data/app.db` and `public/uploads/` would not
> persist. Migrate the database to **Supabase Postgres** and file uploads to
> **Supabase Storage**, then set the env vars from `.env.example`.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind · `node:sqlite` · jose + bcryptjs · lucide-react · SheetJS
