import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/** 관리자: 인증 코드 확인 — 일치 시 이메일을 "인증됨" 상태로 승격 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { code } = await req.json().catch(() => ({}));
  const value = String(code ?? "").trim();
  if (!/^\d{6}$/.test(value))
    return NextResponse.json({ error: "6자리 인증 코드를 입력해 주세요." }, { status: 400 });

  const settings = await store.getSettings();
  const email = (settings.admin_email ?? "").toLowerCase();
  if (!email) return NextResponse.json({ error: "먼저 이메일을 등록해 주세요." }, { status: 400 });

  const tokens = await store.listEmailTokens(email, "verify_email");
  const now = new Date().toISOString();
  const hit = tokens.find((t) => !t.used && t.expires_at > now && t.token_hash === sha256(value));
  if (!hit)
    return NextResponse.json({ error: "인증 코드가 올바르지 않거나 만료되었습니다." }, { status: 400 });

  await store.markEmailTokenUsed(hit.id);
  await store.updateSettings({ admin_email_verified: true });
  await store.addAuditLog({ action: "email_verified", target_id: "admin", target_label: `관리자 이메일 인증: ${email}` });
  return NextResponse.json({ ok: true });
}
