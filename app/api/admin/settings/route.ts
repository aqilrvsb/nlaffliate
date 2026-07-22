import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSetting, setSetting, getGrsaiConfig, AI_PROVIDERS } from "@/lib/settings";

export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const cfg = await getGrsaiConfig();
  const savedKey = await getSetting("grsai_key");
  return NextResponse.json({
    // never send the raw key back — just whether one is set + a masked hint
    key_set: !!cfg.key,
    key_hint: cfg.key ? `••••${cfg.key.slice(-4)}` : "",
    key_source: savedKey ? "admin" : cfg.key ? "env" : "none",
    provider: cfg.provider,
    base: cfg.base,
    model: cfg.model,
    providers: Object.entries(AI_PROVIDERS).map(([k, v]) => ({
      key: k, label: v.label, base: v.base,
      defaultModel: v.defaultModel, keyHint: v.keyHint, modelHint: v.modelHint,
    })),
  });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, model, base, provider } = await req.json();

  // Switching provider rewrites base and model to that provider's defaults
  // unless the form also sent explicit ones — otherwise a leftover GRSAI URL
  // would quietly keep serving requests after "switching" to OpenRouter.
  if (typeof provider === "string" && provider in AI_PROVIDERS) {
    const preset = AI_PROVIDERS[provider as keyof typeof AI_PROVIDERS];
    await setSetting("ai_provider", provider);
    await setSetting("grsai_base", (base || preset.base).trim());
    await setSetting("grsai_model", (model || preset.defaultModel).trim());
  } else {
    if (typeof model === "string" && model.trim()) await setSetting("grsai_model", model.trim());
    if (typeof base === "string" && base.trim()) await setSetting("grsai_base", base.trim());
  }

  // Only overwrite the key when a non-empty value is provided,
  // so saving the form without retyping the key keeps the old one.
  if (typeof key === "string" && key.trim()) await setSetting("grsai_key", key.trim());

  return NextResponse.json({ ok: true });
}
