import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** 관리자: 휴무일 목록 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  return NextResponse.json({ blocked: await store.listBlockedDates() });
}

/** 관리자: 휴무일 추가/수정 (같은 날짜는 대체) */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const date = String(body.date ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  const saved = await store.addBlockedDate({
    date,
    reason: String(body.reason ?? "").trim().slice(0, 100),
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ blocked: saved }, { status: 201 });
}
