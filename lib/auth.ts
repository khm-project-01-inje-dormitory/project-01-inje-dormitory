// ─────────────────────────────────────────────────────────────
//  관리자 인증 — 비밀번호 1개 + HMAC 서명 쿠키 세션
//  (단일 관리자 구조. 팀 단위 운영 시 Supabase Auth로 확장 가능)
// ─────────────────────────────────────────────────────────────
import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { isDemoMode } from "./mode";

const COOKIE = "pr_admin";
/**
 * [v1.2] env 초기 비밀번호 — 기본값 없음.
 *  - 미설정이면 env 로그인 경로 자체가 비활성화된다 (admin1234 기본값 부활 금지).
 *  - DB 해시가 존재하면 이 값은 아예 조회되지 않는다(verifyAdminPassword 참조).
 */
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";

/**
 * 비밀번호 해시 유틸 — 두 포맷을 모두 지원 (L-1 마이그레이션)
 *   레거시: "{salt}:{sha256}"       — 빠른 해시(오프라인 크랙 취약)
 *   신규:   "scrypt${N}${salt}${hash}"  — Node 내장 KDF (외부 의존성 0)
 * 검증은 두 포맷 모두 인식하고, 저장은 항상 신규 포맷으로 한다.
 * verify가 레거시 포맷으로 성공했다면 호출부(login/change-password)에서
 * 신규 포맷으로 자동 리해싱해 저장하도록 hashPassword를 그대로 사용하면 된다.
 */
const SCRYPT_N = 16384; // CPU/메모리 비용 (Node 기본과 동일)
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const key = crypto.scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `scrypt$${SCRYPT_N}$${salt}$${key}`;
}

function verifyHash(saved: string, password: string): boolean {
  try {
    if (saved.startsWith("scrypt$")) {
      const [, , salt, hash] = saved.split("$");
      if (!salt || !hash) return false;
      const check = crypto.scryptSync(password, salt, SCRYPT_KEYLEN);
      const savedBuf = Buffer.from(hash, "hex");
      if (savedBuf.length !== check.length) return false;
      return crypto.timingSafeEqual(savedBuf, check);
    }
    // 레거시 salt:sha256
    if (saved.includes(":")) {
      const [salt, hash] = saved.split(":");
      const check = crypto.createHash("sha256").update(salt + password).digest("hex");
      const a = Buffer.from(hash, "hex");
      const b = Buffer.from(check, "hex");
      if (a.length !== b.length) return false;
      return crypto.timingSafeEqual(a, b);
    }
  } catch { /* fall through */ }
  return false;
}

/** 저장된 해시가 레거시 포맷이면 true — 로그인 성공 시 신규 포맷으로 자동 리해싱 */
export function needsRehash(saved?: string | null): boolean {
  return Boolean(saved && !saved.startsWith("scrypt$") && saved.includes(":"));
}

/**
 * DB 저장 해시 검증 — 있으면 그것만 신뢰 (해시 있으면 env 폴백 차단).
 * [v1.2] 폴백 규칙 강화:
 *  - 운영 모드에서 DB 조회가 실패하면 env 폴백하지 않고 로그인을 거부한다
 *    (Supabase 장애·PGRST303 시계 드리프트 중에도 "해시 있음" 설치본에 env 우회
 *    로그인이 통하지 않게 한다).
 *  - env 폴백은 데모 모드(로컬, DB 없음)에서만 동작하며, env가 비어 있으면
 *    기본 비밀번호를 만들지 않고 거부한다.
 */
export async function verifyAdminPassword(password: string): Promise<boolean> {
  let saved: string | undefined;
  try {
    const { store } = await import("./store");
    const st = await store.getSettings();
    saved = (st as { admin_password_hash?: string }).admin_password_hash;
  } catch (err) {
    if (!isDemoMode) {
      // 운영 모드: DB 장애를 "행 없음"으로 위장해 env 우회를 여는 것을 금지
      console.error("[auth] 운영 DB 조회 실패 — 로그인 거부:", err);
      return false;
    }
    // 데모 모드(로컬)에서만 env 폴백 허용
  }
  if (saved) return verifyHash(saved, password);
  return Boolean(ADMIN_PASSWORD) && password === ADMIN_PASSWORD;
}
/**
 * 세션 서명 키 — 프로덕션에서 미설정/기본값이면 부팅 실패로 유도 (H-3).
 * 개발 환경에서는 기본값 허용 (편의).
 */
const SESSION_SECRET = (() => {
  const v = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!v || v === "dev-secret-change-me" || v.length < 16)
      throw new Error("SESSION_SECRET 환경변수가 설정되지 않았거나 너무 짧습니다 (16자 이상 랜덤 문자열 필요).");
    return v;
  }
  return v || "dev-secret-change-me";
})();

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
