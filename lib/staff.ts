import db from "@/lib/db";

/**
 * Staff IDs are the login identity — MNL-001 for marketers, AFL-001 for
 * affiliates, HQNL-001 for admins — and are immutable once assigned.
 *
 * Generation goes through a Postgres sequence per role, so two accounts
 * created at the same instant can never receive the same number. The sequence
 * is the single source of truth; the formatted prefix is cosmetic.
 */

const PREFIX: Record<string, { seq: string; code: string }> = {
  admin:     { seq: "staff_seq_adm", code: "HQNL" },
  marketer:  { seq: "staff_seq_mnl", code: "MNL" },
  affiliate: { seq: "staff_seq_afl", code: "AFL" },
};

/** The next staff ID for a role, e.g. "AFL-007". Atomic and collision-free. */
export async function nextStaffId(role: string): Promise<string> {
  const p = PREFIX[role];
  if (!p) throw new Error(`No staff-ID scheme for role "${role}".`);
  // nextval is atomic even under concurrency, so no two callers collide.
  const row = await db
    .prepare(`SELECT nextval('${p.seq}')::int AS n`)
    .get<{ n: number }>();
  const n = row?.n ?? 1;
  return `${p.code}-${String(n).padStart(3, "0")}`;
}

/** Normalise typed input: trim, uppercase, so "afl-007" matches "AFL-007". */
export function normaliseStaffId(raw?: string | null): string {
  return String(raw ?? "").trim().toUpperCase();
}
