import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-me-please-32chars-min"
);

const COOKIE = "session";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  /** The login identity: MNL-/AFL-/ADM-. */
  staff_id: string;
  role: "marketer" | "affiliate" | "admin";
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

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      id: payload.id as number,
      name: payload.name as string,
      email: (payload.email as string) ?? "",
      staff_id: (payload.staff_id as string) ?? "",
      role: payload.role as "marketer" | "affiliate",
    };
  } catch {
    return null;
  }
}

export function destroySession() {
  cookies().delete(COOKIE);
}
