import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import db from "@/lib/db";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-please-32chars-min"
);

const COOKIE = "session";
/** Set by a leader to manage one of their marketers (see getSession). */
export const ACT_AS = "act_as";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  /** The login identity: MNL-/AFL-/ADMINNL/LMNL-/HQNL. */
  staff_id: string;
  role: "marketer" | "affiliate" | "admin" | "leader" | "director";
  /** When a leader is managing a marketer, who the real leader is. */
  impersonatorId?: number;
  impersonatorName?: string;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);

  cookies().set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

/** The logged-in identity from the JWT, ignoring any "manage as" override. */
export async function getRealSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: (payload.email as string) ?? "",
      staff_id: (payload.staff_id as string) ?? "",
      role: payload.role as SessionUser["role"],
    };
  } catch {
    return null;
  }
}

/**
 * The effective identity for this request.
 *
 * Normally the logged-in user. But a leader may be *managing* one of their
 * marketers (an `act_as` cookie): if the real user is that marketer's leader,
 * the whole app runs as that marketer — reads AND writes — so every tab and
 * endpoint works with no special-casing. Ownership is re-checked on every call,
 * so a tampered cookie can never reach a marketer the leader doesn't own.
 */
export async function getSession(): Promise<SessionUser | null> {
  const real = await getRealSession();
  if (!real) return null;

  const actAs = cookies().get(ACT_AS)?.value;
  if (actAs && real.role === "leader" && /^\d+$/.test(actAs)) {
    const mid = Number(actAs);
    const m = await db
      .prepare(
        "SELECT id, name, email, staff_id FROM users WHERE id = ? AND role = 'marketer' AND leader_id = ?"
      )
      .get<{ id: number; name: string; email: string | null; staff_id: string | null }>(mid, real.id);
    if (m) {
      return {
        id: Number(m.id),
        name: m.name,
        email: m.email ?? "",
        staff_id: m.staff_id ?? "",
        role: "marketer",
        impersonatorId: real.id,
        impersonatorName: real.name,
      };
    }
    // Stale/invalid override — fall through as the real leader.
  }
  return real;
}

export function destroySession() {
  cookies().delete(COOKIE);
  cookies().delete(ACT_AS); // never carry a "manage as" override across logins
}
