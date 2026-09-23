import { NextResponse } from "next/server";
import { isAdmin, verifyAdminPassword, hashPassword } from "@/lib/auth";
import { store } from "@/lib/store";

/** 비밀번호 변경 — 현재 비밀번호 확인 후 DB에 SHA-256+salt 해시 저장 (환경변수는 긴급 복구용으로 유지) */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { current, next } = await req.json().catch(() => ({}));
  if (typeof current !== "string" || typeof next !== "string" || !(await verifyAdminPassword(current)))
    return NextResponse.json({ error: "현재 비밀번호가 올바르지 않습니다." }, { status: 400 });
  if (next.length < 8)
    return NextResponse.json({ error: "새 비밀번호는 8자 이상이어야 합니다." }, { status: 400 });
  if (next === "admin1234")
    return NextResponse.json({ error: "기본 비밀번호는 사용할 수 없습니다." }, { status: 400 });

  // L-1: scrypt 기반 강한 KDF (기존 salt:sha256보다 오프라인 크랙 저항성 훨씬 강함)
  await store.updateSettings({ admin_password_hash: hashPassword(next) });
  await store.addAuditLog({ action: "password_change", target_id: "admin", target_label: "관리자 비밀번호 변경" });
  return NextResponse.json({ ok: true });
}
