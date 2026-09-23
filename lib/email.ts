// ─────────────────────────────────────────────────────────────
//  이메일 발송 — Gmail SMTP (nodemailer)
//  용도: 관리자 이메일 인증 코드 / 비밀번호 찾기(복구) 안내
//  ⚠️ Gmail 일반 비밀번호는 사용 불가 — Google 계정 2단계 인증 활성화 후
//     "앱 비밀번호"를 발급받아 GMAIL_APP_PASSWORD로 설정해야 합니다.
//  무료 한도: 하루 약 500통 (복구 메일 용도로는 사실상 무제한)
// ─────────────────────────────────────────────────────────────
import "server-only";
import nodemailer from "nodemailer";

/** GMAIL_USER + GMAIL_APP_PASSWORD 환경변수가 모두 설정되어 있는지 (미설정이면 이메일 기능 비활성) */
export const EMAIL_CONFIGURED = Boolean(
  process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD
);

/** 이메일 발송 — 실패해도 예외를 던지지 않고 false 반환 (호출부가 상황에 맞게 처리) */
export async function sendEmail(to: string, subject: string, text: string): Promise<boolean> {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    console.warn("[email] GMAIL_USER/GMAIL_APP_PASSWORD 미설정 — 발송 생략:", subject);
    return false;
  }
  const from = process.env.EMAIL_FROM || user; // 발신자는 별도 설정 없으면 Gmail 계정 자체
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true, // 465 = SSL/TLS
      auth: { user, pass },
    });
    await transporter.sendMail({ from, to, subject, text });
    return true;
  } catch (e) {
    console.error("[email] 발송 오류:", e);
    // SMTP 오류를 사용자가 알 수 있는 의미 있는 메시지로 변환한다.
    const err = e as { code?: string; response?: string; message?: string };
    const resp = err.response || err.message || "";
    if (err.code === "EAUTH" || resp.includes("535") || resp.includes("Username and Password not accepted")) {
      throw new Error(
        "Gmail 인증에 실패했습니다 — GMAIL_APP_PASSWORD가 올바른지 확인하세요. Google 계정에서 2단계 인증 활성화 → 앱 비밀번호 생성 → Vercel 환경변수 갱신이 필요합니다."
      );
    }
    if (resp.includes("550") || resp.toLowerCase().includes("rate limit")) {
      throw new Error("Gmail 발송 한도(하루 약 500통)를 초과했거나 수신 서버가 거부했습니다. 잠시 후 다시 시도해 주세요.");
    }
    throw new Error("이메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.");
  }
}
