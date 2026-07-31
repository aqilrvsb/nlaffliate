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
  /** When a leader or admin is managing a marketer, who is really behind it. */
  impersonatorId?: number;
  impersonatorName?: string;
  impersonatorRole?: "leader" | "admin";
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
 * Normally the logged-in user. But a leader — or an admin — may be *managing*
 * a marketer (an `act_as` cookie): the whole app then runs as that marketer,
 * reads AND writes, so every tab and endpoint works with no special-casing. A
 * leader may only reach their own team; an admin may reach any marketer. The
 * permission is re-checked on every call, so a tampered cookie can never reach
 * a marketer the caller isn't allowed to manage.
 */
export async function getSession(): Promise<SessionUser | null> {
  const real = await getRealSession();
  if (!real) return null;

  const actAs = cookies().get(ACT_AS)?.value;
  const canManage = real.role === "leader" || real.role === "admin";
  if (actAs && canManage && /^\d+$/.test(actAs)) {
    const mid = Number(actAs);
    const m =
      real.role === "admin"
        ? await db
            .prepare("SELECT id, name, email, staff_id FROM users WHERE id = ? AND role = 'marketer'")
            .get<{ id: number; name: string; email: string | null; staff_id: string | null }>(mid)
        : await db
            .prepare("SELECT id, name, email, staff_id FROM users WHERE id = ? AND role = 'marketer' AND leader_id = ?")
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
        impersonatorRole: real.role as "leader" | "admin",
      };
    }
    // Stale/invalid override — fall through as the real user.
  }
  return real;
}

export function destroySession() {
  cookies().delete(COOKIE);
  cookies().delete(ACT_AS); // never carry a "manage as" override across logins
}
