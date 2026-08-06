import { getSetting } from "@/lib/settings";

/**
 * Telegram group notifications via the Bot API — no paid gateway, just a bot
 * token (from @BotFather) and the target group's chat_id. Both live in the
 * settings table so they can be changed without a redeploy.
 */
export async function getTelegramConfig() {
  const token = (await getSetting("telegram_bot_token")) || process.env.TELEGRAM_BOT_TOKEN || "";
  const chatId = (await getSetting("telegram_chat_id")) || "";
  return { token, chatId };
}

/** Post a message to the configured group. Best-effort; never throws. */
export async function sendTelegram(
  text: string,
  opts?: { chatId?: string; token?: string }
): Promise<{ ok: boolean; error?: string }> {
  const cfg = await getTelegramConfig();
  const token = opts?.token || cfg.token;
  const chatId = opts?.chatId || cfg.chatId;
  if (!token) return { ok: false, error: "Telegram bot token belum diset." };
  if (!chatId) return { ok: false, error: "Telegram group chat_id belum diset." };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(8000),
    });
    const d = await res.json().catch(() => ({}));
    return d?.ok ? { ok: true } : { ok: false, error: d?.description || `HTTP ${res.status}` };
  } catch (e: any) {
    return { ok: false, error: e?.message || "network error" };
  }
}

/**
 * Find the group chat_id from recent updates — used by the admin "detect"
 * button. The bot must be in the group and someone must have posted a message
 * that mentions it (e.g. /start@YourBot) or made it an admin, since privacy
 * mode hides ordinary messages. Returns the newest group/supergroup chat seen.
 */
export async function detectChatId(): Promise<{ chatId: string; title: string } | null> {
  const { token } = await getTelegramConfig();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(8000),
    });
    const d = await res.json().catch(() => ({}));
    if (!d?.ok || !Array.isArray(d.result)) return null;
    for (const u of [...d.result].reverse()) {
      const chat = u?.message?.chat || u?.my_chat_member?.chat || u?.channel_post?.chat;
      if (chat && (chat.type === "group" || chat.type === "supergroup")) {
        return { chatId: String(chat.id), title: chat.title || "" };
      }
    }
    return null;
  } catch {
    return null;
  }
}
