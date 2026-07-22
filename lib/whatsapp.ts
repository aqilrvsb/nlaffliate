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

    const res = await fetch(`${API}/api/send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
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
      `${API}/api/statusDevice?device_id=${encodeURIComponent(device)}`
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

export function welcomeMessage(name: string) {
  return `Selamat Datang ${name}

Anda Sudah Boleh Akses kepada Sistem

https://www.nlaffliatearmy.com/`;
}

export function sampleShippedMessage(opts: {
  brand?: string | null;
  products: string[];
  courier?: string | null;
  tracking?: string | null;
  link?: string | null;
}) {
  const lines = [
    "Notification NLAffliate",
    "",
    "Request Sample Anda Sudah Dihantar",
    "",
  ];
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
