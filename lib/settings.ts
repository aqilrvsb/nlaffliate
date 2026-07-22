import db from "@/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get<{ value: string }>(key);
  return row ? row.value : null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value) VALUES (?, ?)
       ON CONFLICT (key) DO UPDATE SET value = excluded.value`
    )
    .run(key, value);
}

/**
 * Vision providers the app can read screenshots through.
 *
 * Both speak the OpenAI /chat/completions shape, which is why swapping one
 * for the other needs no code change — only a base URL, key and model.
 */
export const AI_PROVIDERS = {
  grsai: {
    label: "GRSAI",
    base: "https://grsaiapi.com/v1",
    defaultModel: "gemini-2.5-flash",
    keyHint: "sk-…",
    modelHint: "gemini-2.5-flash",
  },
  openrouter: {
    label: "OpenRouter",
    base: "https://openrouter.ai/api/v1",
    defaultModel: "google/gemini-2.5-flash",
    keyHint: "sk-or-v1-…",
    // OpenRouter namespaces models by vendor; the bare name 404s.
    modelHint: "google/gemini-2.5-flash",
  },
} as const;

export type AiProvider = keyof typeof AI_PROVIDERS;

/**
 * Resolved AI config: admin-saved settings take precedence over env.
 *
 * Keys stay named grsai_* for backwards compatibility — renaming them would
 * silently drop the key an existing deployment is already running on.
 */
export async function getGrsaiConfig() {
  const saved = (await getSetting("ai_provider")) as AiProvider | null;
  const provider: AiProvider =
    saved && saved in AI_PROVIDERS ? saved : "grsai";
  const preset = AI_PROVIDERS[provider];

  const key = (await getSetting("grsai_key")) || process.env.GRSAI_API_KEY || "";
  const base =
    (await getSetting("grsai_base")) ||
    process.env.GRSAI_BASE_URL ||
    preset.base;
  const model =
    (await getSetting("grsai_model")) ||
    process.env.GRSAI_MODEL ||
    preset.defaultModel;

  return { provider, key, base, model };
}

/**
 * Extra headers a provider wants. OpenRouter uses these for attribution in
 * its dashboard and rankings; sending them costs nothing elsewhere.
 */
export function providerHeaders(provider: AiProvider): Record<string, string> {
  if (provider !== "openrouter") return {};
  return {
    "HTTP-Referer": "https://www.nlaffliatearmy.com",
    "X-Title": "NL Affiliate Army",
  };
}
