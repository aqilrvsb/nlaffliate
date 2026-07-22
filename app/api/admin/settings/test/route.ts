import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getGrsaiConfig, providerHeaders, AI_PROVIDERS, type AiProvider } from "@/lib/settings";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

/**
 * Try the configured provider with a real vision request and report back.
 *
 * Sends a tiny generated image and asks for one word, so it proves the whole
 * path — key accepted, model exists, and the model can actually see images —
 * without waiting on a full screenshot read. Swapping provider blind and
 * discovering it at the next upload is how a launch day goes wrong.
 *
 * Optionally accepts an unsaved provider/key/model so a new setup can be
 * checked before committing it.
 */

// 1x1 red PNG — the smallest thing that is unambiguously an image.
const PIXEL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const saved = await getGrsaiConfig();

  const provider = (body.provider || saved.provider) as AiProvider;
  const preset = AI_PROVIDERS[provider] ?? AI_PROVIDERS.grsai;
  const key = String(body.key || "").trim() || saved.key;
  const base = String(body.base || "").trim() || (body.provider ? preset.base : saved.base);
  const model = String(body.model || "").trim() || (body.provider ? preset.defaultModel : saved.model);

  if (!key)
    return NextResponse.json({ ok: false, error: "No API key set." }, { status: 400 });

  const t0 = Date.now();
  try {
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
        max_tokens: 20,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "Reply with the single word: OK" },
              { type: "image_url", image_url: { url: PIXEL } },
            ],
          },
        ],
      }),
    });

    const ms = Date.now() - t0;
    const text = await res.text();

    if (!res.ok) {
      return NextResponse.json(
        { ok: false, ms, status: res.status, error: text.slice(0, 300), provider, base, model },
        { status: 200 }
      );
    }

    let reply = "";
    try {
      reply = JSON.parse(text)?.choices?.[0]?.message?.content ?? "";
    } catch {
      reply = text.slice(0, 120);
    }

    return NextResponse.json({
      ok: true, ms, provider, base, model,
      reply: String(reply).trim().slice(0, 80),
    });
  } catch (e: any) {
    return NextResponse.json({
      ok: false, ms: Date.now() - t0, provider, base, model,
      error: e?.message || "Request failed (bad base URL?)",
    });
  }
}
