import db from "@/lib/db";

/**
 * One phone number = one account. Every place that creates a user (public
 * register, marketer-adds-affiliate, admin-adds-leader/marketer) checks this
 * first, so a person can never end up holding two accounts — e.g. both an
 * affiliate and a marketer — on the same WhatsApp number.
 */
export type PhoneClash = { staff_id: string | null; role: string };

/** The account already using this (normalised) phone, if any. */
export async function phoneClash(phone: string): Promise<PhoneClash | null> {
  if (!phone) return null;
  const row = await db
    .prepare("SELECT staff_id, role FROM users WHERE phone = ?")
    .get<PhoneClash>(phone);
  return row ?? null;
}

const ROLE_MS: Record<string, string> = {
  marketer: "marketer",
  affiliate: "affiliate",
  leader: "leader marketer",
  admin: "admin",
  director: "director",
};

/** Standard Malay refusal that names the existing account. */
export function phoneClashError(c: PhoneClash): string {
  const role = ROLE_MS[c.role] ?? c.role;
  return `Nombor WhatsApp ini sudah didaftarkan sebagai ${role} (${c.staff_id}). Sila log masuk, atau hubungi admin jika ingin menukar peranan.`;
}
