import { NextResponse } from "next/server";
import { store, softDeleteReservation, restoreReservation, purgeReservation } from "@/lib/store";
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
