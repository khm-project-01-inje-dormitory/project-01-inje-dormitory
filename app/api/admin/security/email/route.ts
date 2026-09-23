import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { EMAIL_CONFIGURED, sendEmail } from "@/lib/email";

/** 인증 코드 해시 — 원본 코드는 이메일로만 전달, DB에는 해시만 저장 */
const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** 관리자: 인증된 이메일 등록 + 인증 코드 발송 (이메일 변경 시 인증 상태 초기화) */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { email: raw } = await req.json().catch(() => ({}));
  const email = String(raw ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다." }, { status: 400 });
  if (!EMAIL_CONFIGURED)
    return NextResponse.json(
      { error: "이메일 발송 설정이 필요합니다. Vercel 환경변수에 RESEND_API_KEY를 추가한 뒤 다시 시도해 주세요." },
      { status: 400 }
    );

  const settings = await store.getSettings();

  // 발송 빈도 제한 — 동일 이메일 1시간 내 인증 코드 3회 초과 시 차단
  const recent = await store.listEmailTokens(email, "verify_email");
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if (recent.filter((t) => t.created_at >= hourAgo && !t.used).length >= 3)
    return NextResponse.json({ error: "인증 코드 발송 횟수가 초과되었습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  // 이메일 저장 + 인증 상태 초기화
  await store.updateSettings({ admin_email: email, admin_email_verified: false });

  // 6자리 코드 — 10분 유효, 해시 저장
  const code = String(Math.floor(100000 + Math.random() * 900000));
  await store.saveEmailToken({
    id: crypto.randomUUID(),
    email,
    token_hash: sha256(code),
    purpose: "verify_email",
    used: false,
    expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    created_at: new Date().toISOString(),
  });

  const sent = await sendEmail(
    email,
    `[${settings.pension_name}] 관리자 이메일 인증 코드`,
    `관리자 페이지 이메일 인증 코드입니다.\n\n인증 코드: ${code}\n\n10분간 유효합니다. 본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.`
  );
  return NextResponse.json({ ok: true, sent });
}
