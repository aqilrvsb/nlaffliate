import db from "@/lib/db";

export function getSetting(key: string): string | null {
  const row = db.prepare("SELECT value FROM settings WHERE key = ?").get(key) as any;
  return row ? (row.value as string) : null;
}

export function setSetting(key: string, value: string) {
  db.prepare(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`
  ).run(key, value);
}

// Resolved GRSAI config: admin-saved settings take precedence over env.
export function getGrsaiConfig() {
  const key = getSetting("grsai_key") || process.env.GRSAI_API_KEY || "";
  const base =
    getSetting("grsai_base") || process.env.GRSAI_BASE_URL || "https://grsaiapi.com/v1";
  const model =
    getSetting("grsai_model") || process.env.GRSAI_MODEL || "gemini-2.5-flash";
  return { key, base, model };
}
