import { NextResponse } from "next/server";
import { store, listDeletedReservations } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

// 숨김(소프트 삭제) 예약 목록 — 복구 화면용
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  return NextResponse.json({ reservations: await listDeletedReservations() });
}
