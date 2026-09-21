// ─────────────────────────────────────────────────────────────
//  관리자 인증 — 비밀번호 1개 + HMAC 서명 쿠키 세션
//  (단일 관리자 구조. 팀 단위 운영 시 Supabase Auth로 확장 가능)
// ─────────────────────────────────────────────────────────────
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pr_admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function sign(payload: string): string {
  return crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
}

export function makeSessionToken(): string {
  const payload = `admin.${Date.now()}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token?: string | null): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload);
  try {
    return crypto.timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
  } catch {
    return false;
  }
}

/** API route용: 요청 쿠키 검증 */
export function isAdmin(req: Request): boolean {
  const cookie = req.headers.get("cookie") || "";
  const token = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return verifySessionToken(token ? decodeURIComponent(token) : null);
}

/** Server Component용 */
export async function isAdminLoggedIn(): Promise<boolean> {
  const c = await cookies();
  return verifySessionToken(c.get(COOKIE)?.value);
}

export const ADMIN_COOKIE = COOKIE;
