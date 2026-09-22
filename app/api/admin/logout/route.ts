import { NextResponse } from "next/server";
import { ADMIN_COOKIE } from "@/lib/auth";

/** 로그아웃 — 세션 쿠키 즉시 만료 */
export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );
  return res;
}
