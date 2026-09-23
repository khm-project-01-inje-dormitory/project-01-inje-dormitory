import { NextResponse } from "next/server";
import { ADMIN_COOKIE, hashPassword, makeSessionToken, needsRehash, verifyAdminPassword } from "@/lib/auth";
import { store } from "@/lib/store";
import { checkRate } from "@/lib/rate-limit";

/**
 * 관리자 로그인 — 비밀번호 검증 후 HMAC 쿠키 발급
 * 보안:
 *  - verifyAdminPassword가 단일 진실 소스: DB 해시가 있으면 그것만 신뢰, 없으면 env로 폴백
 *  - 원래는 `password === ADMIN_PASSWORD` 조건을 OR로 두어 해시 변경 후에도 env로 로그인이 되던
 *    우선순위 결함이 있었음(H-1). 지금은 verify 함수 결과 하나만 신뢰한다.
 *  - IP+엔드포인트 기준 rate limit (무차별 대입 방어)
 *  - env 폴백으로 로그인 성공 시 감사로그 기록(하이재킹 알림용)
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const gate = checkRate(`login:${ip}`, 5, 300_000); // 5분에 5회
  if (!gate.ok)
    return NextResponse.json({ error: "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const { password } = await req.json().catch(() => ({}));
  if (typeof password !== "string" || !password || !(await verifyAdminPassword(password)))
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });

  // env 폴백 로그인 감지 + 레거시 해시 자동 리해싱 (L-1 무중단 마이그레이션)
  try {
    const s = await store.getSettings();
    if (!s.admin_password_hash) {
      await store.addAuditLog({
        action: "admin_login_env",
        target_id: "admin",
        target_label: `env 비밀번호로 로그인 (해시 미설정 상태) · IP=${ip}`,
      });
    } else if (needsRehash(s.admin_password_hash)) {
      await store.updateSettings({ admin_password_hash: hashPassword(password) });
      await store.addAuditLog({
        action: "password_rehash",
        target_id: "admin",
        target_label: "레거시 해시(salt:sha256) → scrypt 자동 업그레이드",
      });
    }
  } catch { /* 감사로그·리해싱 실패는 로그인 성공을 막지 않는다 */ }

  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(makeSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return res;
}
