import { NextResponse } from "next/server";
import { store, computeAvailability } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { notifyAdmins } from "@/lib/push";
import { makeCode, nightsBetween, todayKST } from "@/lib/format";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";

/** 관리자: 전체 예약 목록 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  return NextResponse.json({ reservations: await store.listReservations() });
}

/** 공개: 예약 신청 → 휴무일/인원 정책 검사 → 관리자 푸시 발송 */
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const guest_name = String(body.guest_name ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const check_in = String(body.check_in ?? "").trim();
    const check_out = String(body.check_out ?? "").trim();
    const guests = Math.floor(Number(body.guests));
    const depositor = String(body.depositor ?? "").trim() || guest_name;
    const message = String(body.message ?? "").trim().slice(0, 500);

    if (!guest_name || !phone) return NextResponse.json({ error: "이름과 연락처를 입력해 주세요." }, { status: 400 });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(check_out))
      return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
    const nights = nightsBetween(check_in, check_out);
    if (nights < 1) return NextResponse.json({ error: "체크아웃은 체크인 다음 날이어야 합니다." }, { status: 400 });
    if (check_in < todayKST()) return NextResponse.json({ error: "과거 날짜는 예약할 수 없습니다." }, { status: 400 });
    if (!guests || guests < 1) return NextResponse.json({ error: "투숙 인원을 선택해 주세요." }, { status: 400 });

    const settings = await store.getSettings();
    if (guests > settings.max_guests)
      return NextResponse.json({ error: `수용 인원은 최대 ${settings.max_guests}명입니다.` }, { status: 400 });

    // 휴무일(예약 불가 날짜) 포함 여부 — 하드 차단
    const [blocked, existing] = await Promise.all([store.listBlockedDates(), store.listReservations()]);
    const blockedSet = new Set(blocked.map((b) => b.date));
    const hasBlocked = eachNights(check_in, check_out).some((d) => blockedSet.has(d));
    if (hasBlocked)
      return NextResponse.json(
        { error: "휴무일이 포함된 기간입니다. 다른 날짜를 선택해 주세요." },
        { status: 400 }
      );

    const over = computeAvailability(existing, check_in, check_out, settings.max_guests, blocked.map((b) => b.date))
      .some((d) => d.booked + guests > settings.max_guests);

    // 자동 마감 모드: 초과 신청은 아예 접수하지 않음 (기본: 경고 후 접수 → 관리자 판단)
    if (over && settings.auto_close_overbook)
      return NextResponse.json(
        { error: "인원이 가득 찬 날짜가 포함되어 있습니다. 다른 날짜나 인원으로 다시 시도해 주세요." },
        { status: 400 }
      );

    const per_person_price = settings.per_person_price;
    const now = new Date().toISOString();
    const r = await store.createReservation({
      id: crypto.randomUUID(),
      code: makeCode(),
      guest_name,
      phone,
      check_in,
      check_out,
      nights,
      guests,
      per_person_price,
      total_amount: per_person_price * guests * nights,
      depositor,
      message,
      status: "pending",
      refund_status: "none",
      created_at: now,
      updated_at: now,
    });

    await notifyAdmins(
      `🔔 새 예약 신청 — ${guest_name}님`,
      `${check_in} ${nights}박 · ${guests}명 · ${(per_person_price * guests * nights).toLocaleString("ko-KR")}원${over ? " ⚠ 수용 인원 초과" : ""}`,
      "/admin"
    );
    return NextResponse.json({ id: r.id, code: r.code }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "예약 처리 중 오류가 발생했습니다." }, { status: 500 });
  }
}

function eachNights(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn;
  while (cur < checkOut) {
    out.push(cur);
    const [y, m, d] = cur.split("-").map(Number);
    cur = new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
  }
  return out;
}
