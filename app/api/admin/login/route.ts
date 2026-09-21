import { NextResponse } from "next/server";
import { ADMIN_COOKIE, ADMIN_PASSWORD, makeSessionToken } from "@/lib/auth";

/** 관리자 로그인 — 환경변수 ADMIN_PASSWORD 검증 후 HMAC 쿠키 발급 */
export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({}));
  if (!password || password !== ADMIN_PASSWORD)
    return NextResponse.json({ error: "비밀번호가 올바르지 않습니다." }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=${encodeURIComponent(makeSessionToken())}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return res;
}
