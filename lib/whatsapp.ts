import { getSetting } from "@/lib/settings";

/**
 * WhatsApp notifications via WhaCenter.
 *
 * Admin pastes one Device ID; everything else is derived. The API is a plain
 * form POST to /api/send with device_id, number and message.
 *
 * Every send is best-effort: a notification failing must never break the
 * action that triggered it. Approving an affiliate or shipping a sample is
 * the real work — the message is a courtesy on top, so failures are logged
 * and swallowed rather than surfaced as an error the operator can't fix.
 */

const API = "https://api.whacenter.com";

export async function whatsappDeviceId(): Promise<string> {
  return (
    (await getSetting("whacenter_device")) ||
    process.env.WHACENTER_DEVICE_ID ||
    ""
  );
}

/**
 * Normalise a Malaysian number to WhaCenter's expected form.
 * "0123456789" -> "60123456789"; "+60 12-345 6789" -> "60123456789".
 */
export function normalisePhone(raw?: string | null): string {
  if (!raw) return "";
  let n = String(raw).replace(/[^0-9]/g, "");
  if (!n) return "";
  if (n.startsWith("60")) return n;
  if (n.startsWith("0")) return `60${n.slice(1)}`;
  return n;
}

export type SendResult = { ok: boolean; skipped?: string; error?: string };

export async function sendWhatsApp(
  phone: string | null | undefined,
  message: string
): Promise<SendResult> {
  const device = await whatsappDeviceId();
  if (!device) return { ok: false, skipped: "No WhatsApp device configured." };

  const number = normalisePhone(phone);
  if (!number) return { ok: false, skipped: "No phone number on this account." };

  try {
    const form = new URLSearchParams();
    form.append("device_id", device);
    form.append("number", number);
    form.append("message", message);

    // A courtesy message must never hold a request open. Without a deadline
    // an unresponsive provider keeps the whole serverless invocation alive
    // until the platform kills it.
    const res = await fetch(`${API}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      return { ok: false, error: `${res.status} ${t.slice(0, 160)}` };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Send failed" };
  }
}

/** Is the configured device actually connected? Used by the admin test. */
export async function deviceStatus(deviceId?: string) {
  const device = deviceId || (await whatsappDeviceId());
  if (!device) return { ok: false, error: "No device ID set." };
  try {
    const res = await fetch(
      `${API}/api/statusDevice?device_id=${encodeURIComponent(device)}`,
      { signal: AbortSignal.timeout(8000) }
    );
    const text = await res.text();
    let data: any = null;
    try { data = JSON.parse(text); } catch { /* provider may return prose */ }
    return { ok: res.ok, status: res.status, data: data ?? text.slice(0, 200) };
  } catch (e: any) {
    return { ok: false, error: e?.message || "Status check failed" };
  }
}

/* ── Message templates ─────────────────────────────────── */

/**
 * Every automated message opens the same way, so a recipient can tell at a
 * glance that it came from the system rather than from a person.
 */
const HEADER = "Notification NLAffliateArmy";
const LOGIN_URL = "https://www.nlaffliatearmy.com/login";

function compose(...blocks: (string | string[])[]) {
  const lines: string[] = [HEADER, ""];
  for (const b of blocks) lines.push(...(Array.isArray(b) ? b : [b]));
  return lines.join("\n");
}

export function welcomeMessage(name: string) {
  return compose([
    `Selamat Datang ${name}`,
    "",
    "Anda Sudah Boleh Akses kepada Sistem",
    "",
    LOGIN_URL,
  ]);
}

/**
 * Sent when an account is provisioned. The staff member never chose a Staff ID
 * or a password, so the account is unusable unless we hand both over.
 */
export function accountCreatedMessage(opts: {
  name: string; staffId: string; password: string;
}) {
  return compose([
    `Selamat Datang ${opts.name}`,
    "",
    "Akaun anda sudah dibuka. Butiran log masuk:",
    "",
    `ID Staff: ${opts.staffId}`,
    `Password: ${opts.password}`,
    "",
    `Link login: ${LOGIN_URL}`,
    "",
    "Sila tukar password anda selepas log masuk.",
  ]);
}

/* ── Marketer alerts ───────────────────────────────────── */

/**
 * The marketer's phone, looked up from any affiliate of theirs.
 *
 * Returned as null when unassigned or when the marketer has no number on
 * file, so callers can skip quietly rather than guess.
 */
export async function marketerContact(affiliateId: number) {
  const { default: db } = await import("@/lib/db");
  return db
    .prepare(
      `SELECT m.name AS marketer_name, m.phone AS marketer_phone, a.name AS affiliate_name
         FROM users a JOIN users m ON m.id = a.marketer_id
        WHERE a.id = ?`
    )
    .get<{ marketer_name: string; marketer_phone: string | null; affiliate_name: string }>(
      affiliateId
    );
}

export type LiveSummary = {
  affiliate: string;
  brand?: string | null;
  profile?: string | null;
  date: string;
  start?: string | null;
  end?: string | null;
  note?: string | null;
};

function summaryLines(s: LiveSummary): string[] {
  const lines = [`Affiliate: ${s.affiliate}`];
  if (s.brand) lines.push(`Brand: ${s.brand}`);
  if (s.profile) lines.push(`Profile: ${s.profile}`);
  lines.push(`Tarikh: ${s.date}`);
  if (s.start) lines.push(`Masa: ${s.start}${s.end ? ` - ${s.end}` : ""}`);
  if (s.note) lines.push(`Nota: ${s.note}`);
  return lines;
}

/** Told to the marketer when an affiliate books, changes or drops a live. */
export function scheduleAlert(
  kind: "created" | "updated" | "deleted",
  s: LiveSummary
) {
  const head = {
    created: "Jadual Live Baru",
    updated: "Jadual Live Dikemaskini",
    deleted: "Jadual Live Dipadam",
  }[kind];
  return compose([head, "", ...summaryLines(s)]);
}

/** Told to the marketer when results land, with the figures that arrived. */
export function resultsAlert(
  s: LiveSummary,
  r: {
    gmv?: number | null;
    viewers?: number | null;
    items_sold?: number | null;
    duration?: string | null;
    title?: string | null;
  }
) {
  const lines = [HEADER, "", "Screenshot Live Dimuat Naik", ""];
  if (r.title) lines.push(`Live: ${r.title}`);
  lines.push(...summaryLines(s), "");
  lines.push(`GMV: ${r.gmv != null ? `RM${r.gmv}` : "-"}`);
  lines.push(`Viewers: ${r.viewers ?? "-"}`);
  lines.push(`Items Sold: ${r.items_sold ?? "-"}`);
  lines.push(`Duration: ${r.duration || "-"}`);
  return lines.join("\n");
}

export function sampleShippedMessage(opts: {
  brand?: string | null;
  products: string[];
  courier?: string | null;
  tracking?: string | null;
  link?: string | null;
}) {
  const lines = [HEADER, "", "Request Sample Anda Sudah Dihantar", ""];
  if (opts.brand) lines.push(`Brand: ${opts.brand}`);
  if (opts.products.length)
    lines.push(`Produk: ${opts.products.join(", ")}`);
  if (opts.tracking)
    lines.push(
      `Tracking: ${opts.courier ? `${opts.courier} — ` : ""}${opts.tracking}`
    );
  if (opts.link) lines.push(`Link: ${opts.link}`);
  return lines.join("\n");
}
