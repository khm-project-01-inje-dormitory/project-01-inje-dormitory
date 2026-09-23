// ─────────────────────────────────────────────────────────────
//  이메일 발송 — Resend REST API (SDK 의존성 없이 fetch 사용)
//  용도: 관리자 이메일 인증 코드 / 비밀번호 찾기(복구) 안내
// ─────────────────────────────────────────────────────────────
import "server-only";

/** RESEND_API_KEY 환경변수가 설정되어 있는지 (미설정이면 이메일 기능 비활성) */
export const EMAIL_CONFIGURED = Boolean(process.env.RESEND_API_KEY);

/** 이메일 발송 — 실패해도 예외를 던지지 않고 false 반환 (호출부가 상황에 맞게 처리) */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.warn("[email] RESEND_API_KEY 미설정 — 발송 생략:", subject);
    return false;
  }
  const from = process.env.EMAIL_FROM || "onboarding@resend.dev";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error("[email] 발송 실패:", res.status, await res.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] 발송 오류:", e);
    return false;
  }
}
