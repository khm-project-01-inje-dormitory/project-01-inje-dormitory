import { NextResponse } from "next/server";
import { store, computeAvailability } from "@/lib/store";
import { notifyAdmins } from "@/lib/push";
import { nightsBetween, maskPhone } from "@/lib/format";
import { checkRate } from "@/lib/rate-limit";

const normPhone = (s: string) => s.replace(/[^0-9]/g, "");

/** 공개: 예약자 본인 수정 — 입금대기(pending)에서만, 날짜/인원 변경 (관리자 푸시 발송) */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const gate = checkRate(`edit:${ip}`, 10, 600_000);
  if (!gate.ok)
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const phone = normPhone(String(body.phone ?? ""));
  const id = String(body.id ?? "");
  const code = String(body.code ?? "").trim().toUpperCase();
  const check_in = String(body.check_in ?? "").trim();
  const check_out = String(body.check_out ?? "").trim();
  const guests = Math.floor(Number(body.guests));
  if (!phone || (!id && !code))
    return NextResponse.json({ error: "정보가 부족합니다." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(check_out))
    return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
  const newNights = nightsBetween(check_in, check_out);
  if (newNights < 1) return NextResponse.json({ error: "체크아웃은 체크인 다음 날이어야 합니다." }, { status: 400 });
  if (!guests || guests < 1) return NextResponse.json({ error: "투숙 인원을 선택해 주세요." }, { status: 400 });

  const all = await store.listReservations();
  const found = all.find(
    (r) => normPhone(r.phone).endsWith(phone.slice(-8)) && (id ? r.id === id : r.code.toUpperCase() === code)
  );
  if (!found) return NextResponse.json({ error: "일치하는 예약이 없습니다." }, { status: 404 });
  if (found.status !== "pending")
    return NextResponse.json({ error: "입금 확인된 예약은 수정할 수 없습니다. 관리자에게 연락해 주세요." }, { status: 400 });

  const settings = await store.getSettings();
  if (guests > settings.max_guests)
    return NextResponse.json({ error: `수용 인원은 최대 ${settings.max_guests}명입니다.` }, { status: 400 });

  const blocked = await store.listBlockedDates();
  const bset = new Set(blocked.map((b) => b.date));
  let cur = check_in;
  while (cur < check_out) {
    if (bset.has(cur)) return NextResponse.json({ error: "휴무일이 포함된 기간입니다." }, { status: 400 });
    const [y, m, dd] = cur.split("-").map(Number);
    cur = new Date(Date.UTC(y, m - 1, dd + 1)).toISOString().slice(0, 10);
  }
  const others = all.filter((r) => r.id !== found.id); // 자기 예약 분 제외 후 정원 검증
  const over = computeAvailability(others, check_in, check_out, settings.max_guests, blocked.map((b) => b.date))
    .some((d) => d.booked + guests > settings.max_guests);
  if (over)
    return NextResponse.json(
      { error: settings.auto_close_overbook ? "해당 날짜는 인원이 가득 찼습니다." : "해당 날짜의 잔여 인원을 초과했습니다. 관리자 확인 후 안내드립니다." },
      { status: 400 }
    );

  const total = found.per_person_price * guests * newNights;
  const updated = await store.updateReservation(found.id, {
    check_in, check_out, nights: newNights, guests, total_amount: total, updated_at: new Date().toISOString(),
  });
  await store.addAuditLog({
    action: "guest_edit", target_id: found.id, target_label: found.code,
    before: { check_in: found.check_in, check_out: found.check_out, guests: found.guests, total: found.total_amount },
    after: { check_in, check_out, guests, total },
  });
  await notifyAdmins(
    `📝 예약 수정 — ${found.guest_name}님 (${found.code})`,
    `${found.check_in}~${found.check_out} ${found.guests}명 → ${check_in}~${check_out} ${guests}명 · ${total.toLocaleString("ko-KR")}원`,
    "/admin"
  );
  // M-3: 응답에서 전화번호 마스킹
  return NextResponse.json({ reservation: updated ? { ...updated, phone: maskPhone(updated.phone) } : updated });
}
