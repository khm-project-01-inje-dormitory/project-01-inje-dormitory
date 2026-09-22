import { NextResponse } from "next/server";
import { store, softDeleteReservation, restoreReservation, purgeReservation, computeAvailability } from "@/lib/store";
import { nightsBetween, todayKST } from "@/lib/format";
import { isAdmin } from "@/lib/auth";
import type { ReservationStatus } from "@/types";

const ALLOWED: ReservationStatus[] = ["pending", "confirmed", "cancelled", "completed"];

/** 관리자: 예약 상태/환불 상태/요청사항 변경 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const patch: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (!ALLOWED.includes(body.status))
      return NextResponse.json({ error: "잘못된 상태값" }, { status: 400 });
    patch.status = body.status;
  }
  if (body.refund_status !== undefined) {
    if (!["none", "pending", "done"].includes(body.refund_status))
      return NextResponse.json({ error: "잘못된 환불 상태값" }, { status: 400 });
    patch.refund_status = body.refund_status;
  }
  if (body.message !== undefined) patch.message = String(body.message).slice(0, 500);
  // ── 예약 수정 (관리자) — 날짜/인원 변경, 금액 자동 재계산, 부분환불 연동 ──
  if (body.edit) {
    const e = body.edit;
    const check_in = String(e.check_in ?? "").trim();
    const check_out = String(e.check_out ?? "").trim();
    const guests = Math.floor(Number(e.guests));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(check_in) || !/^\d{4}-\d{2}-\d{2}$/.test(check_out))
      return NextResponse.json({ error: "날짜 형식이 올바르지 않습니다." }, { status: 400 });
    const newNights = nightsBetween(check_in, check_out);
    if (newNights < 1) return NextResponse.json({ error: "체크아웃은 체크인 다음 날이어야 합니다." }, { status: 400 });
    if (!guests || guests < 1) return NextResponse.json({ error: "투숙 인원을 확인해 주세요." }, { status: 400 });

    const all = await store.listReservations();
    const target = all.find((r) => r.id === params.id);
    if (!target) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    if (target.status === "cancelled" || target.status === "completed")
      return NextResponse.json({ error: "취소·완료된 예약은 수정할 수 없습니다." }, { status: 400 });

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

    // 핵심: 수정 대상 예약의 기존 분을 "빼고" 정원 검증 (자기 예약이 정원 차지하는 버그 방지)
    const others = all.filter((r) => r.id !== target.id);
    const over = computeAvailability(others, check_in, check_out, settings.max_guests, blocked.map((b) => b.date))
      .some((d) => d.booked + guests > settings.max_guests);
    if (over && settings.auto_close_overbook)
      return NextResponse.json({ error: "해당 날짜는 인원이 가득 찹니다." }, { status: 400 });

    const total = target.per_person_price * guests * newNights; // 예약 시점 단가 보존 원칙
    const refundNeeded = total < target.total_amount && target.status === "confirmed";
    const patch2: Record<string, unknown> = { check_in, check_out, nights: newNights, guests, total_amount: total, updated_at: new Date().toISOString() };
    if (refundNeeded) patch2.refund_status = "pending"; // 부분환불 → 기존 환불관리 흐름 재사용
    const updated = await store.updateReservation(params.id, patch2);
    await store.addAuditLog({
      action: "edit", target_id: params.id, target_label: target.code,
      before: { check_in: target.check_in, check_out: target.check_out, guests: target.guests, total: target.total_amount },
      after: { check_in, check_out, guests, total, refund_needed: refundNeeded },
    });
    return NextResponse.json({ reservation: updated, refund_needed: refundNeeded });
  }
  // 소프트 삭제(숨김) / 복구 / 영구삭제 — 이력 보존 (제안 A+B)
  if (body.deleted_at !== undefined) {
    const all = await store.listReservations();
    const target = all.find((r) => r.id === params.id);
    if (!target) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    if (body.deleted_at) await softDeleteReservation(params.id, target.code, target);
    return NextResponse.json({ ok: true });
  }
  if (body.restore === true) {
    await restoreReservation(params.id, String(body.target_label ?? ""));
    return NextResponse.json({ ok: true });
  }
  if (body.purge === true) {
    const all = await store.listReservations();
    const all2 = [...all, ...(store.listDeletedReservations ? await store.listDeletedReservations() : [])];
    const target = all2.find((r) => r.id === params.id);
    if (!target) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
    await purgeReservation(params.id, target.code, target);
    return NextResponse.json({ ok: true });
  }
  const updated = await store.updateReservation(params.id, patch);
  if (!updated) return NextResponse.json({ error: "예약을 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ reservation: updated });
}
