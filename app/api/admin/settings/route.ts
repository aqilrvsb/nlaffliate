import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSetting, setSetting, getGrsaiConfig } from "@/lib/settings";

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
    base: cfg.base,
    model: cfg.model,
  });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { key, model, base } = await req.json();

  // Only overwrite the key when a non-empty value is provided,
  // so saving the form without retyping the key keeps the old one.
  if (typeof key === "string" && key.trim()) await setSetting("grsai_key", key.trim());
  if (typeof model === "string" && model.trim()) await setSetting("grsai_model", model.trim());
  if (typeof base === "string" && base.trim()) await setSetting("grsai_base", base.trim());

  return NextResponse.json({ ok: true });
}
