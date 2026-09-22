import { NextResponse } from "next/server";
import { store, computeAvailability } from "@/lib/store";
import { todayKST } from "@/lib/format";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** 공개: 날짜별 잔여 현황(휴무일 포함) ?from=YYYY-MM-DD&days=N */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || todayKST();
  const days = Math.min(Math.max(1, Number(searchParams.get("days") || 14)), 90);
  const to = new Date(new Date(from + "T00:00:00Z").getTime() + days * 86400000)
    .toISOString()
    .slice(0, 10);

  const [settings, reservations, blocked] = await Promise.all([
    store.getSettings(),
    store.listReservations(),
    store.listBlockedDates(),
  ]);
  return NextResponse.json({
    days: computeAvailability(
      reservations, from, to, settings.max_guests,
      blocked.map((b) => b.date)
    ),
  });
}
