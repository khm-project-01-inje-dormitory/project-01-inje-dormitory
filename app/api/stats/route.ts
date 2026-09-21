import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { addDays, parseYMD, todayKST } from "@/lib/format";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

const KST_DATE = (iso: string) => new Date(new Date(iso).getTime() + 9 * 3600000).toISOString().slice(0, 10);

/** 관리자: 대시보드 통계 (매출/예약 추이 + 운영 인사이트) */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });

  const [settings, reservations] = await Promise.all([store.getSettings(), store.listReservations()]);
  const today = todayKST();
  const ym = today.slice(0, 7);

  const paid = reservations.filter((r) => r.status === "confirmed" || r.status === "completed");
  const monthRows = reservations.filter(
    (r) => r.status !== "cancelled" && r.check_in.startsWith(ym)
  );
  const pending = reservations.filter((r) => r.status === "pending");
  const refundPending = reservations.filter(
    (r) => r.status === "cancelled" && r.refund_status === "pending"
  );

  const cards = {
    monthRevenue: monthRows
      .filter((r) => r.status === "confirmed" || r.status === "completed")
      .reduce((s, r) => s + r.total_amount, 0),
    monthCount: monthRows.length,
    monthGuests: monthRows.reduce((s, r) => s + r.guests, 0),
    pendingCount: pending.length,
    pendingAmount: pending.reduce((s, r) => s + r.total_amount, 0),
    avgGuests: monthRows.length
      ? Math.round((monthRows.reduce((s, r) => s + r.guests, 0) / monthRows.length) * 10) / 10
      : 0,
    // ── 운영 인사이트 ──
    avgLeadDays: paid.length
      ? Math.round(
          (paid.reduce((s, r) => s + (parseYMD(r.check_in).getTime() - parseYMD(KST_DATE(r.created_at)).getTime()), 0) /
            paid.length / 86400000) * 10
        ) / 10
      : 0,
    avgNights: paid.length
      ? Math.round((paid.reduce((s, r) => s + r.nights, 0) / paid.length) * 10) / 10
      : 0,
    repeatGuests: [...new Set(paid.map((r) => r.phone))].filter(
      (p) => paid.filter((r) => r.phone === p).length >= 2
    ).length,
    refundPendingCount: refundPending.length,
    refundPendingAmount: refundPending.reduce((s, r) => s + r.total_amount, 0),
  };

  // 최근 6개월 매출/건수
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = parseYMD(today);
    d.setUTCMonth(d.getUTCMonth() - i);
    const key = d.toISOString().slice(0, 7);
    const rows = paid.filter((r) => r.check_in.startsWith(key));
    months.push({
      label: `${d.getUTCMonth() + 1}월`,
      revenue: rows.reduce((s, r) => s + r.total_amount, 0),
      count: rows.length,
    });
  }

  // 최근 8주 예약 건수
  const weeks = [];
  for (let i = 7; i >= 0; i--) {
    const start = addDays(today, -i * 7);
    const end = addDays(start, 7);
    const rows = paid.filter((r) => r.check_in >= start && r.check_in < end);
    weeks.push({ label: start.slice(5).replace("-", "/"), count: rows.length });
  }

  // 요일별 예약 분포
  const dow = DOW.map((label, i) => ({
    label,
    count: paid.filter((r) => parseYMD(r.check_in).getUTCDay() === i).length,
  }));

  const mix = {
    pending: reservations.filter((r) => r.status === "pending").length,
    confirmed: reservations.filter((r) => r.status === "confirmed").length,
    completed: reservations.filter((r) => r.status === "completed").length,
    cancelled: reservations.filter((r) => r.status === "cancelled").length,
  };

  const upcoming = reservations
    .filter((r) => r.status === "confirmed" && r.check_in >= today && r.check_in <= addDays(today, 7))
    .slice(0, 10);

  const recent = [...reservations]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 6);

  return NextResponse.json({ cards, months, weeks, dow, mix, upcoming, recent, maxGuests: settings.max_guests });
}
