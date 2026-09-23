import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { store } from "@/lib/store";
import { ADMIN_PASSWORD } from "@/lib/auth";
import { EMAIL_CONFIGURED, sendEmail } from "@/lib/email";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/**
 * 공개: 관리자 비밀번호 찾기 — 인증된 이메일로 복구 안내 발송
 * 보안: 이메일 열거 방지를 위해 어떤 요청에도 항상 동일한 성공 응답을 반환한다.
 *   - DB 해시 없음(비밀번호 변경 전)  → 환경변수 기본 비밀번호를 이메일로 발송
 *   - DB 해시 있음(변경 후 분실)      → 1회용 비밀번호 재설정 링크 발송 (15분 유효)
 *   - 미인증/미등록 이메일, 발송 설정 없음 → 아무것도 보내지 않음 (응답은 동일)
 */
export async function POST(req: Request) {
  const { email: raw } = await req.json().catch(() => ({}));
  const email = String(raw ?? "").trim().toLowerCase();

  // 응답은 항상 동일 — 유효한 요청인지 외부에서 판단할 수 없게 한다
  const generic = { ok: true, message: "입력하신 이메일로 안내를 보내드렸어요. 인증된 이메일이 아니라면 아무 메일도 도착하지 않습니다." };

  if (!EMAIL_CONFIGURED || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json(generic);

  const settings = await store.getSettings();
  const saved = (settings.admin_email ?? "").toLowerCase();
  if (!saved || saved !== email || !settings.admin_email_verified) return NextResponse.json(generic);

  // 발송 빈도 제한 — 동일 이메일 1시간 내 복구 요청 3회 초과 시 발송 생략 (응답은 동일)
  const recent = await store.listEmailTokens(email, "recover");
  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  if (recent.filter((t) => t.created_at >= hourAgo).length >= 3) {
    console.warn("[recover] 빈도 제한 — 발송 생략:", email);
    return NextResponse.json(generic);
  }

  const origin = req.headers.get("origin") || new URL(req.url).origin;
  let sent = false;

  if (!settings.admin_password_hash) {
    // 비밀번호 변경 이력 없음 → 환경변수(초기) 비밀번호 발송
    sent = await sendEmail(
      email,
      `[${settings.pension_name}] 관리자 비밀번호 안내`,
      `요청하신 관리자 비밀번호 안내입니다.\n\n비밀번호: ${ADMIN_PASSWORD}\n\n로그인 후 보안 탭에서 비밀번호를 변경하시길 권장합니다.\n본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.`
    );
  } else {
    // 비밀번호 변경 이력 있음 → 1회용 재설정 링크 발송 (15분 유효, 해시 저장)
    const token = crypto.randomBytes(32).toString("hex");
    await store.saveEmailToken({
      id: crypto.randomUUID(),
      email,
      token_hash: sha256(token),
      purpose: "recover",
      used: false,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      created_at: new Date().toISOString(),
    });
    const link = `${origin}/admin/reset?token=${token}`;
    sent = await sendEmail(
      email,
      `[${settings.pension_name}] 관리자 비밀번호 재설정`,
      `비밀번호 재설정 링크입니다.\n\n${link}\n\n이 링크는 15분간, 1회만 사용할 수 있습니다.\n본인이 요청하지 않았다면 이 메일은 무시하셔도 됩니다.`
    );
  }

  if (!sent) console.error("[recover] 이메일 발송 실패:", email);
  return NextResponse.json(generic);
}
