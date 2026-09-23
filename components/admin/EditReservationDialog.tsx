"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { fmtWon } from "@/lib/format";
import type { Reservation } from "@/types";

const nights = (a: string, b: string) =>
  Math.max(0, Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000));

/** 관리자 예약 수정 — 날짜/인원 변경, 총액 실시간 미리보기, 부분환불 안내 */
export default function EditReservationDialog({ reservation, onClose, onSaved }: {
  reservation: Reservation;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [checkIn, setCheckIn] = useState(reservation.check_in);
  const [checkOut, setCheckOut] = useState(reservation.check_out);
  const [guests, setGuests] = useState(String(reservation.guests));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const n = nights(checkIn, checkOut);
  const g = Number(guests) || 0;
  const total = reservation.per_person_price * g * n;
  const decreased = total < reservation.total_amount && reservation.status === "confirmed";

  async function save() {
    if (n < 1) return setError("체크아웃은 체크인 다음 날이어야 합니다.");
    if (g < 1) return setError("투숙 인원을 확인해 주세요.");
    if (!confirm(`예약을 수정할까요?\n${reservation.check_in}~${reservation.check_out} ${reservation.guests}명 (${reservation.total_amount.toLocaleString()}원)\n→ ${checkIn}~${checkOut} ${g}명 (${total.toLocaleString()}원)`)) return;
    setBusy(true); setError("");
    try {
      const res = await fetch(`/api/reservations/${reservation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ edit: { check_in: checkIn, check_out: checkOut, guests: g } }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "수정 실패");
      if (d.refund_needed) alert("총액이 줄어 환불대기로 전환했습니다. 차액 환불 후 입금확인 탭에서 환불완료 처리해 주세요.");
      onSaved(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "수정 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="card-surface p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="font-black">예약 수정 <span className="text-sm text-muted-foreground font-medium">{reservation.code} · {reservation.guest_name}님</span></h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">체크인</label><input type="date" className="input !px-2.5 !text-sm min-w-0" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} /></div>
          <div><label className="label">체크아웃</label><input type="date" className="input !px-2.5 !text-sm min-w-0" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} /></div>
        </div>
        <div><label className="label">투숙 인원</label>
          <input type="text" inputMode="numeric" className="input max-w-[120px]" value={guests} onChange={(e) => setGuests(e.target.value.replace(/\D/g, "").slice(0, 3))} />
        </div>
        <div className="rounded-xl bg-muted px-4 py-3 text-sm space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">{n}박 · {g}명 · {fmtWon(reservation.per_person_price)}/인</span><b className="tabular-nums">{fmtWon(total)}</b></div>
          {decreased && <p className="text-xs font-bold text-amber-600">⚠ 총액이 줄어 환불대기로 전환됩니다 (부분환불)</p>}
          {reservation.status === "confirmed" && total > reservation.total_amount && <p className="text-xs text-muted-foreground">추가 입금분 — 안내문 복사로 안내해 주세요.</p>}
        </div>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary flex-1" onClick={save} disabled={busy}>{busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}</button>
          <button className="btn-soft flex-1" onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
