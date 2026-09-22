import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { notifyAdmins } from "@/lib/push";
import { fmtDateKorean, fmtWon, todayKST } from "@/lib/format";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * 관리자 아침 브리핑 — 오늘 체크인/체크아웃/입금대기 요약을 푸시로 발송
 * Vercel Cron이 매일 아침(KST 08:30) Authorization: Bearer CRON_SECRET 으로 호출,
 * 대시보드의 "브리핑 미리보기" 버튼(관리자 쿠키)으로도 즉시 발송 가능.
 */
async function handle(req: Request) {
  const secret = process.env.CRON_SECRET;
  const bearer = req.headers.get("authorization") || "";
  const bearerOk = secret ? bearer === `Bearer ${secret}` : true;
  if (!bearerOk && !isAdmin(req))
    return NextResponse.json({ error: "권한 없음" }, { status: 401 });

  const today = todayKST();
  const all = await store.listReservations();
  const active = all.filter((r) => r.status === "confirmed");
  const checkins = active.filter((r) => r.check_in === today);
  const checkouts = active.filter((r) => r.check_out === today);
  const pending = all.filter((r) => r.status === "pending");

  const summary = {
    date: today,
    checkins: checkins.map((r) => r.guest_name),
    checkouts: checkouts.map((r) => r.guest_name),
    pendingCount: pending.length,
    pendingAmount: pending.reduce((s, r) => s + r.total_amount, 0),
  };

  const parts: string[] = [];
  parts.push(
    checkins.length
      ? `체크인 ${checkins.length}건 — ${checkins.map((r) => `${r.guest_name}(${r.guests}명)`).join(", ")}`
      : "오늘 체크인 없음"
  );
  if (checkouts.length) parts.push(`체크아웃 ${checkouts.length}건 — ${checkouts.map((r) => r.guest_name).join(", ")}`);
  parts.push(pending.length ? `입금대기 ${pending.length}건 · ${fmtWon(summary.pendingAmount)}` : "입금대기 없음");

  await notifyAdmins(`🌅 아침 브리핑 · ${fmtDateKorean(today)}`, parts.join("\n"), "/admin");
  return NextResponse.json({ ok: true, summary, message: parts.join(" | ") });
}

export async function GET(req: Request) {
  return handle(req);
}
export async function POST(req: Request) {
  return handle(req);
}
