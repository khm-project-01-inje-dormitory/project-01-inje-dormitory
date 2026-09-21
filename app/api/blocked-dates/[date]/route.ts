import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

/** 관리자: 휴무일 해제 */
export async function DELETE(req: Request, { params }: { params: { date: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const ok = await store.removeBlockedDate(params.date);
  if (!ok) return NextResponse.json({ error: "휴무일을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
