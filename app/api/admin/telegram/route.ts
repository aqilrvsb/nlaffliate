import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSetting, setSetting } from "@/lib/settings";
import { sendTelegram, detectChatId } from "@/lib/telegram";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function admin() {
  const user = await getSession();
  return user && user.role === "admin" ? user : null;
}

/** Current Telegram config (token hint + chat_id) for the admin card. */
export async function GET() {
  if (!(await admin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const token = (await getSetting("telegram_bot_token")) || "";
  const chatId = (await getSetting("telegram_chat_id")) || "";
  return NextResponse.json({
    token_set: !!token,
    token_hint: token ? `${token.slice(0, 10)}…` : "",
    chat_id: chatId,
  });
}

/**
 * action:
 *   (save)   { token?, chat_id? } — store either/both (blank token = keep).
 *   detect   — read the group chat_id from getUpdates (bot must be in group).
 *   test     — send a test message to the configured group.
 */
export async function POST(req: Request) {
  if (!(await admin())) return NextResponse.json({ error: "Admin only." }, { status: 403 });
  const body = await req.json().catch(() => ({}));

  if (body.action === "detect") {
    const found = await detectChatId();
    if (!found)
      return NextResponse.json(
        { error: "Tiada group dijumpai. Pastikan bot ada dalam group & hantar satu mesej (cth: /start@NLARMY_BOT), kemudian cuba lagi." },
        { status: 404 }
      );
    await setSetting("telegram_chat_id", found.chatId);
    return NextResponse.json({ ok: true, chat_id: found.chatId, title: found.title });
  }

  if (body.action === "test") {
    const r = await sendTelegram("🔔 Ujian dari NL Affiliate Army — sambungan Telegram berjaya.");
    return NextResponse.json({ ok: r.ok, error: r.error ?? null });
  }

  const token = String(body.token ?? "").trim();
  const chatId = String(body.chat_id ?? "").trim();
  if (token) await setSetting("telegram_bot_token", token);
  if (chatId) await setSetting("telegram_chat_id", chatId);
  return NextResponse.json({ ok: true });
}
