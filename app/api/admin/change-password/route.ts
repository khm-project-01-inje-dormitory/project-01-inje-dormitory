import { NextResponse } from "next/server";
import { isAdmin, verifyAdminPassword } from "@/lib/auth";
import { store } from "@/lib/store";
import crypto from "node:crypto";

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

  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + next).digest("hex");
  await store.updateSettings({ admin_password_hash: `${salt}:${hash}` });
  await store.addAuditLog({ action: "password_change", target_id: "admin", target_label: "관리자 비밀번호 변경" });
  return NextResponse.json({ ok: true });
}
