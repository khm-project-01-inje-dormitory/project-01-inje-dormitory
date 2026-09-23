import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { EMAIL_CONFIGURED } from "@/lib/email";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** 관리자: 보안 탭 상태 — 이메일 발송 설정·인증된 이메일·비밀번호 해시 존재 여부 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const s = await store.getSettings();
  return NextResponse.json({
    emailConfigured: EMAIL_CONFIGURED,
    adminEmail: s.admin_email ?? "",
    verified: Boolean(s.admin_email_verified),
    hasHash: Boolean(s.admin_password_hash),
  });
}
