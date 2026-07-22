import db from "@/lib/db";

/**
 * The marketer's Inhouse account, created on first use.
 *
 * Lives that ran without anyone scheduling them are filed here rather than
 * credited to a real affiliate. It is a real affiliate row so its lives flow
 * through every existing report, but with an unusable password — it is a
 * bucket, not a person who logs in.
 *
 * Shared by the Check Schedule import and by converting an Unknown row, so
 * both land in the same account instead of creating rival ghosts.
 */
export async function inhouseProfile(marketerId: number) {
  const email = `inhouse+${marketerId}@nlaffliatearmy.local`;

  let u = await db
    .prepare("SELECT id FROM users WHERE email = ?")
    .get<{ id: number }>(email);
  if (!u) {
    const created = await db
      .prepare(
        `INSERT INTO users (name, email, phone, address, password_hash, role, marketer_id)
         VALUES (?, ?, NULL, NULL, ?, 'affiliate', ?) RETURNING id`
      )
      .run("Inhouse", email, "!", marketerId);
    u = { id: Number(created.lastInsertRowid) };
  }

  let p = await db
    .prepare("SELECT id FROM tiktok_profiles WHERE user_id = ? ORDER BY id")
    .get<{ id: number }>(u.id);
  if (!p) {
    const created = await db
      .prepare(
        "INSERT INTO tiktok_profiles (user_id, label, url) VALUES (?, 'Inhouse', ?) RETURNING id"
      )
      .run(u.id, "https://www.tiktok.com/");
    p = { id: Number(created.lastInsertRowid) };
  }

  return { userId: u.id, profileId: p.id };
}
