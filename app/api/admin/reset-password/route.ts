import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { store } from "@/lib/store";

const sha256 = (v: string) => crypto.createHash("sha256").update(v).digest("hex");

/**
 * 공개: 비밀번호 재설정 — 이메일로 받은 1회용 토큰 검증 후 새 비밀번호 저장
 * (실패 이유는 재사용·만료·불일치 모두 동일 문구로 응답 — 토큰 상태 노출 방지)
 */
export async function POST(req: Request) {
  const { token, next } = await req.json().catch(() => ({}));
  const value = String(token ?? "").trim();
  const password = String(next ?? "");
  if (!value || password.length < 8 || password === "admin1234")
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 하며 기본 비밀번호는 사용할 수 없습니다." }, { status: 400 });

  // 토큰 검증 — 미사용 + 만료 전 + 해시 일치 (이메일로 전달된 원본 토큰 대조)
  const all = await store.listAllEmailTokens("recover");
  const hit = all.find(
    (t) => !t.used && t.expires_at > new Date().toISOString() && t.token_hash === sha256(value)
  );
  if (!hit)
    return NextResponse.json({ error: "링크가 유효하지 않거나 만료되었습니다. 비밀번호 찾기를 다시 진행해 주세요." }, { status: 400 });

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  await store.updateSettings({ admin_password_hash: `${salt}:${hash}` });
  await store.markEmailTokenUsed(hit.id);
  await store.addAuditLog({ action: "password_reset", target_id: "admin", target_label: `비밀번호 재설정 (이메일 링크): ${hit.email}` });
  return NextResponse.json({ ok: true });
}
