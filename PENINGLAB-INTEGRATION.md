# PeningLab → NL Affiliate Army: Video Ingest API

Push a finished video to an affiliate. It lands in that affiliate's
**Pending Post** tab. When the affiliate pastes the TikTok link, the post
moves itself to **Done Post** — nothing further is needed from PeningLab.

---

## Endpoint

```
POST https://www.nlaffliatearmy.com/api/posts/ingest
Authorization: Bearer <INGEST_API_KEY>
Content-Type: application/json
```

**Ingest key:** `nlaff_ingest_9d2b7c41ae085f3610b4d7e29c86af53`

(Rotatable any time in **Admin → Integrations**. The key set there wins over
the environment variable.)

---

## Request body

PeningLab's native shape is accepted as-is:

```json
{
  "email": "ida@test.com",
  "output_url": "https://peninglab-content.s3.../ugc/abc123.mp4",
  "caption": "Serum ni memang laku masa live semalam 🔥",
  "metadata": {
    "cover_title": "RAMAI BELI?",
    "cover_subtitle": "PATUTLAH RAMBUT DAH TAK GUGUR",
    "cover_thumbnail_url": "https://peninglab-content.s3.../image/abc123.png"
  },
  "date": "2026-07-22",
  "source_id": "peninglab-history-8f21c0"
}
```

| Field | Required | Notes |
|---|---|---|
| `email` | ✅ | The affiliate's login email. `affiliate_id` works instead. |
| `output_url` | ✅ | Direct link to the finished MP4. |
| `caption` | — | Suggested TikTok caption. |
| `metadata.cover_title` | — | Big line on the cover. |
| `metadata.cover_subtitle` | — | Small line on the cover. |
| `metadata.cover_thumbnail_url` | — | Cover image; shown as the post thumbnail. |
| `date` | — | `YYYY-MM-DD`. Defaults to today in Asia/Kuala_Lumpur. This is the date the post is filtered by. |
| `source_id` | — | **Send this.** PeningLab's own history ID. Makes retries idempotent. |

Flat aliases also work if easier: `affiliate_email`, `video_url`,
`cover_title`, `cover_subtitle`, `cover_thumbnail_url`, `post_date`.

---

## Responses

| Status | Body | Meaning |
|---|---|---|
| `200` | `{"ok":true,"id":123}` | Created, now in Pending Post. |
| `200` | `{"ok":true,"id":123,"duplicate":true}` | Already had this `source_id`; nothing created. Safe. |
| `400` | `{"error":"Video link required..."}` | `output_url` missing. |
| `401` | `{"error":"Invalid ingest key."}` | Bad bearer token. |
| `404` | `{"error":"Affiliate not found..."}` | No affiliate with that email. |
| `503` | `{"error":"Ingest key not configured."}` | Key unset on our side. |

Retry on `5xx` and network errors with the **same `source_id`** — duplicates
are impossible. Do **not** retry `400`/`404`; those need a fixed payload.

---

## Discovering valid affiliates

```
GET https://www.nlaffliatearmy.com/api/posts/ingest
Authorization: Bearer <INGEST_API_KEY>
```

Returns the spec plus the affiliate roster, so PeningLab can resolve an email
to a real account before pushing:

```json
{
  "ok": true,
  "spec": { ... },
  "affiliates": [
    { "id": 4, "name": "Ida", "email": "ida@test.com" },
    { "id": 5, "name": "Nadia", "email": "nadia@test.com" }
  ]
}
```

Without the bearer key the same URL returns only `spec` — handy as live docs.

---

## Copy-paste test

```bash
curl -X POST https://www.nlaffliatearmy.com/api/posts/ingest \
  -H "Authorization: Bearer nlaff_ingest_9d2b7c41ae085f3610b4d7e29c86af53" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "ida@test.com",
    "output_url": "https://example.com/video.mp4",
    "caption": "Test dari PeningLab",
    "metadata": { "cover_title": "TEST", "cover_subtitle": "ingest" },
    "date": "2026-07-22",
    "source_id": "peninglab-test-001"
  }'
```

Then log in as that affiliate → **Posting** → the video is in Pending Post.
