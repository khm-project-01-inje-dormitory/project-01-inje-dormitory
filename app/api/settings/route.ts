import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** 공개: 숙소 정보/요금/계좌 (랜딩·예약 화면용) */
export async function GET() {
  return NextResponse.json({ settings: await store.getSettings() });
}

const STR_LIMIT = 300;

/** 관리자: 설정 수정 — 1인당 요금은 10,000~50,000원 범위만 허용 */
export async function PATCH(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  if (body.per_person_price !== undefined) {
    const p = Math.floor(Number(body.per_person_price));
    if (!p || p < 10000 || p > 50000)
      return NextResponse.json({ error: "1인당 요금은 10,000원~50,000원 사이여야 합니다." }, { status: 400 });
    body.per_person_price = p;
  }
  if (body.max_guests !== undefined) {
    const m = Math.floor(Number(body.max_guests));
    if (!m || m < 1 || m > 100)
      return NextResponse.json({ error: "최대 인원은 1~100명 사이여야 합니다." }, { status: 400 });
    body.max_guests = m;
  }
  if (body.auto_close_overbook !== undefined) body.auto_close_overbook = Boolean(body.auto_close_overbook);
  for (const k of ["address", "map_link", "parking_info", "arrival_info"] as const) {
    if (body[k] !== undefined) body[k] = String(body[k]).trim().slice(0, STR_LIMIT);
  }

  const settings = await store.updateSettings(body);
  return NextResponse.json({ settings });
}
