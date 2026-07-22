import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/settings";
import { deviceStatus, sendWhatsApp, normalisePhone } from "@/lib/whatsapp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Admin reads/sets the WhaCenter device, and can send itself a test. */
export async function GET() {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const saved = await getSetting("whacenter_device");
  const device = saved || process.env.WHACENTER_DEVICE_ID || "";
  return NextResponse.json({
    device_set: !!device,
    device_hint: device ? `****${device.slice(-6)}` : "",
    source: saved ? "admin" : device ? "env" : "none",
  });
}

export async function POST(req: Request) {
  const user = await getSession();
  if (!user || user.role !== "admin")
    return NextResponse.json({ error: "Admin only." }, { status: 403 });

  const body = await req.json().catch(() => ({}));

  // A status check proves the id resolves; an actual send proves it delivers.
  if (body.action === "test") {
    const device = String(body.device || "").trim() || undefined;
    const status = await deviceStatus(device);
    if (body.phone) {
      const sent = await sendWhatsApp(
        String(body.phone),
        "Test dari NL Affiliate Army - WhatsApp notification sudah berfungsi."
      );
      return NextResponse.json({ status, sent, to: normalisePhone(String(body.phone)) });
    }
    return NextResponse.json({ status });
  }

  await setSetting("whacenter_device", String(body.device ?? "").trim());
  return NextResponse.json({ ok: true });
}
