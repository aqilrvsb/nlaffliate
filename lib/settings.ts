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

/** Resolved GRSAI config: admin-saved settings take precedence over env. */
export async function getGrsaiConfig() {
  const key = (await getSetting("grsai_key")) || process.env.GRSAI_API_KEY || "";
  const base =
    (await getSetting("grsai_base")) ||
    process.env.GRSAI_BASE_URL ||
    "https://grsaiapi.com/v1";
  const model =
    (await getSetting("grsai_model")) ||
    process.env.GRSAI_MODEL ||
    "gemini-2.5-flash";
  return { key, base, model };
}
