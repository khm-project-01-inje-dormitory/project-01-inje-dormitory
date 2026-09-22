// ─────────────────────────────────────────────────────────────
//  관리자 인증 — 비밀번호 1개 + HMAC 서명 쿠키 세션
//  (단일 관리자 구조. 팀 단위 운영 시 Supabase Auth로 확장 가능)
// ─────────────────────────────────────────────────────────────
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "pr_admin";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin1234";

/** DB 저장 해시(salt:sha256) 검증 — settings 테이블의 admin_password_hash */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  try {
    const { store } = await import("./store");
    const st = await store.getSettings();
    const saved = (st as { admin_password_hash?: string }).admin_password_hash;
    if (saved && saved.includes(":")) {
      const [salt, hash] = saved.split(":");
      const check = crypto.createHash("sha256").update(salt + password).digest("hex");
      if (check === hash) return true;
      // DB 해시가 있으면 환경변수 폴백 없이 종료 (해시가 우선 — env는 초기 비밀번호/복구용)
      return false;
    }
  } catch { /* DB 조회 실패 시에만 환경변수로 폴백 */ }
  return password === ADMIN_PASSWORD;
}
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
