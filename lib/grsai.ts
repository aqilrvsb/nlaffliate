/**
 * Reads a TikTok Live "recap" screenshot with Gemini 2.5 Flash via GRSAI
 * and extracts the key numbers. GRSAI exposes an OpenAI-compatible
 * /chat/completions endpoint, so we send the image as a data URL.
 */

import { getGrsaiConfig, providerHeaders } from "@/lib/settings";

export type LiveStats = {
  live_title: string | null;
  gmv: number | null;
  viewers: number | null;
  items_sold: number | null;
  duration_live: string | null;
  raw: string;
};

const SYSTEM_PROMPT = `You extract data from a TikTok LIVE performance screenshot.
Return ONLY a compact JSON object with these exact keys:
{
  "live_title": string,   // the LIVE title/name at the top (e.g. "PROMO GLOW - IDA")
  "gmv": number,          // "Attr. GMV" / Total Sales, numeric only (e.g. 333.7). No currency symbol.
  "viewers": number,      // "Viewers" count, integer
  "items_sold": number,   // "Items sold" count, integer
  "duration_live": string // live duration exactly as shown, e.g. "2h 0m 25s"
}
Rules:
- If a value is not visible, use null for that key.
- live_title is the bold heading text, NOT the "Start time" line.
- Strip currency symbols/commas from gmv and viewers (RM333.7 -> 333.7, 1,234 -> 1234).
- Do NOT include any text outside the JSON. No markdown fences.`;

function extractJson(text: string): any {
  // tolerate ```json fences or stray prose
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("no JSON in model output");
  return JSON.parse(candidate.slice(start, end + 1));
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return v;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export type AnalyticsRow = {
  name: string | null;       // "PROMO GLOW - NANA"
  date: string | null;       // YYYY-MM-DD
  time: string | null;       // HH:MM (24h)
  duration: string | null;   // "2h 1m"
  ad_spend: number | null;   // column 4
  gross_revenue: number | null; // column 5
  roi: number | null;        // column 6
};

const TABLE_PROMPT = `You read a TikTok LIVE analytics TABLE screenshot with multiple rows.
Each row has: a LIVE name, a start date-time + duration, a status, then money columns.
Return ONLY a JSON array. One object per data row, in this exact shape:
[{
  "name": string,          // the LIVE name, e.g. "PROMO GLOW - NANA"
  "date": "YYYY-MM-DD",    // start date
  "time": "HH:MM",         // start time, 24-hour
  "duration": string,      // duration exactly as shown, e.g. "2h 1m"
  "ad_spend": number,      // 4th column (Spend), numeric only
  "gross_revenue": number, // 5th column (Gross Revenue), numeric only
  "roi": number            // 6th column (ROI), numeric only
}]
Rules:
- Include EVERY data row you can see. Skip the header row.
- Strip "MYR"/"RM"/commas from numbers (72.12 MYR -> 72.12).
- If a cell is blank use null. Output ONLY the JSON array, no prose, no fences.`;

function extractJsonArray(text: string): any[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("no JSON array in model output");
  const arr = JSON.parse(candidate.slice(start, end + 1));
  return Array.isArray(arr) ? arr : [];
}

/**
 * Generic single-image → JSON-object extractor. Caller supplies a system
 * prompt describing the exact keys to return. Used for the GMV-Max
 * "Overview" and "Key metrics" screenshots.
 */
export async function readImageJson(
  imageBase64DataUrl: string,
  systemPrompt: string
): Promise<Record<string, any>> {
  const { provider, key, base, model } = await getGrsaiConfig();
  if (!key) throw new Error("GRSAI_API_KEY not set.");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...providerHeaders(provider),
    },
    body: JSON.stringify({
      model, temperature: 0, max_tokens: 1000, stream: false,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract the values as JSON." },
            { type: "image_url", image_url: { url: imageBase64DataUrl } },
          ],
        },
      ],
    }),
  });
  if (!res.ok) throw new Error(`GRSAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  return extractJson(content);
}

export async function readAnalyticsTable(
  imageBase64DataUrl: string
): Promise<AnalyticsRow[]> {
  const { provider, key, base, model } = await getGrsaiConfig();
  if (!key) throw new Error("GRSAI_API_KEY not set — cannot read bulk analytics.");

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...providerHeaders(provider),
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 4000,
      stream: false,
      messages: [
        { role: "system", content: TABLE_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "Extract every row of this LIVE analytics table as a JSON array." },
            { type: "image_url", image_url: { url: imageBase64DataUrl } },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GRSAI ${res.status}: ${t.slice(0, 300)}`);
  }
  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const rows = extractJsonArray(content);

  return rows.map((r: any) => ({
    name: r.name != null ? String(r.name).trim() : null,
    date: r.date != null ? String(r.date).trim() : null,
    time: r.time != null ? String(r.time).trim() : null,
    duration: r.duration != null ? String(r.duration).trim() : null,
    ad_spend: toNum(r.ad_spend),
    gross_revenue: toNum(r.gross_revenue),
    roi: toNum(r.roi),
  }));
}

export async function readLiveScreenshot(
  imageBase64DataUrl: string
): Promise<LiveStats> {
  // Admin-entered key/model (from the DB) take precedence over env.
  // GRSAI chat endpoint is OpenAI-compatible and MUST include /v1
  // (https://grsaiapi.com/v1/chat/completions) — verified against HCKCREA P4.
  const { provider, key, base, model } = await getGrsaiConfig();

  if (!key) {
    return {
      live_title: null,
      gmv: null,
      viewers: null,
      items_sold: null,
      duration_live: null,
      raw: "GRSAI_API_KEY not set — enter values manually.",
    };
  }

  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
      ...providerHeaders(provider),
    },
    body: JSON.stringify({
      model,
      temperature: 0,
      max_tokens: 1000,
      stream: false,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the LIVE stats from this screenshot as JSON.",
            },
            {
              type: "image_url",
              image_url: { url: imageBase64DataUrl },
            },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`GRSAI ${res.status}: ${t.slice(0, 300)}`);
  }

  const data = await res.json();
  const content: string = data?.choices?.[0]?.message?.content ?? "";
  const parsed = extractJson(content);

  return {
    live_title:
      parsed.live_title != null && String(parsed.live_title).trim()
        ? String(parsed.live_title).trim()
        : null,
    gmv: toNum(parsed.gmv),
    viewers: toNum(parsed.viewers),
    items_sold: toNum(parsed.items_sold),
    duration_live:
      parsed.duration_live != null ? String(parsed.duration_live) : null,
    raw: content,
  };
}
