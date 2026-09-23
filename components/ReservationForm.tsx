"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, Minus, Plus, Users } from "lucide-react";
import { fmtWon, nightsBetween, todayKST } from "@/lib/format";
import type { DayAvailability } from "@/types";

interface Props {
  price: number;
  maxGuests: number;
  /** 인원 마감 정책 — true: 초과박 자동 차단(불가 안내), false: 경고 후 접수(관리자 확인 안내) */
  autoCloseOverbook: boolean;
}

export default function ReservationForm({ price, maxGuests, autoCloseOverbook }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState(2);
  const [depositor, setDepositor] = useState("");
  const [message, setMessage] = useState("");
  const [days, setDays] = useState<DayAvailability[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const today = todayKST();
  const nights = useMemo(
    () => (checkIn && checkOut ? Math.max(0, nightsBetween(checkIn, checkOut)) : 0),
    [checkIn, checkOut]
  );
  const total = nights * guests * price;

  // 체크인 기준 30일 잔여 현황 로드
  useEffect(() => {
    if (!checkIn) return setDays([]);
    fetch(`/api/availability?from=${checkIn}&days=30`)
      .then((r) => r.json())
      .then((d) => setDays(d.days ?? []))
      .catch(() => setDays([]));
  }, [checkIn]);

  const onChangeCheckIn = (v: string) => {
    setCheckIn(v);
    if (checkOut && v >= checkOut) {
      // 체크아웃 자동 보정: 체크인 +1일
      const d = new Date(v);
      d.setUTCDate(d.getUTCDate() + 1);
      setCheckOut(d.toISOString().slice(0, 10));
    }
  };

  // 선택 기간 중 수용 초과 박 / 휴무일 계산
  const overNights = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return 0;
    return days.filter(
      (d) => d.date >= checkIn && d.date < checkOut && d.booked + guests > maxGuests
    ).length;
  }, [days, checkIn, checkOut, guests, maxGuests, nights]);

  const blockedNights = useMemo(() => {
    if (!checkIn || !checkOut || nights < 1) return 0;
    return days.filter((d) => d.blocked && d.date >= checkIn && d.date < checkOut).length;
  }, [days, checkIn, checkOut, nights]);

  async function submit() {
    setError("");
    if (!name.trim()) return setError("이름을 입력해 주세요.");
    if (!/^[0-9-+\s]{9,15}$/.test(phone.trim())) return setError("연락처를 정확히 입력해 주세요.");
    if (!checkIn || !checkOut || nights < 1) return setError("체크인/체크아웃 날짜를 확인해 주세요.");
    if (guests < 1) return setError("투숙 인원을 선택해 주세요.");
    if (guests > maxGuests) return setError(`수용 인원은 최대 ${maxGuests}명입니다.`);

    setSubmitting(true);
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guest_name: name.trim(),
          phone: phone.trim(),
          check_in: checkIn,
          check_out: checkOut,
          guests,
          depositor: depositor.trim() || name.trim(),
          message: message.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "예약 처리 중 오류가 발생했습니다.");
      router.push(`/reserve/done?id=${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="card-surface p-5 sm:p-6 space-y-5">
        <div>
          <label className="label">예약자 이름</label>
          <input className="input" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">연락처</label>
          <input
            className="input"
            type="tel"
            inputMode="tel"
            placeholder="010-1234-5678"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">체크인</label>
            <input className="input" type="date" min={today} value={checkIn} onChange={(e) => onChangeCheckIn(e.target.value)} />
          </div>
          <div>
            <label className="label">체크아웃</label>
            <input className="input" type="date" min={checkIn || today} value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">
            <Users className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
            투숙 인원 <span className="text-muted-foreground font-normal">(최대 {maxGuests}명)</span>
          </label>
          <div className="flex items-center gap-4">
            <button
              type="button"
              className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted"
              onClick={() => setGuests((g) => Math.max(1, g - 1))}
              aria-label="인원 감소"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-2xl font-extrabold w-12 text-center tabular-nums">{guests}</span>
            <button
              type="button"
              className="w-11 h-11 rounded-xl border border-border flex items-center justify-center hover:bg-muted"
              onClick={() => setGuests((g) => Math.min(maxGuests, g + 1))}
              aria-label="인원 증가"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div>
          <label className="label">입금자명 <span className="text-muted-foreground font-normal">· 미입력 시 예약자명</span></label>
          <input className="input" placeholder="입금하실 계좌의 이름" value={depositor} onChange={(e) => setDepositor(e.target.value)} />
        </div>
        <div>
          <label className="label">요청사항 <span className="text-muted-foreground font-normal">(선택)</span></label>
          <textarea
            className="input min-h-[88px] resize-none"
            placeholder="도착 예정 시간, 문의사항 등"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      </div>

      {blockedNights > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-slate-100 border border-slate-200 text-slate-600 px-4 py-3 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          선택한 기간 중 {blockedNights}박은 휴무일입니다. 다른 날짜를 선택해 주세요.
        </div>
      )}

      {overNights > 0 && blockedNights === 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 text-warning px-4 py-3 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          {autoCloseOverbook ? (
            // 자동 차단 모드 — 서버가 신청 자체를 거부하므로 "불가" 기준으로 안내
            <span>
              선택한 기간 중 {overNights}박이 수용인원({maxGuests}명)을 초과합니다. 최대 수용인원을 넘어 예약할 경우 예약이
              불가능해요. 관리자 문의 후 예약을 진행해 주세요.
            </span>
          ) : (
            // 경고 후 접수 모드 — 신청은 가능하며 관리자가 승인/거절
            <span>선택한 기간 중 {overNights}박이 수용 인원({maxGuests}명)을 초과합니다. 관리자 확인 후 거절될 수 있어요.</span>
          )}
        </div>
      )}

      <div className="card-surface p-5 sm:p-6">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>1인 · 1박</span>
          <span className="font-semibold text-foreground">{fmtWon(price)}</span>
        </div>
        <div className="flex items-center justify-between text-sm text-muted-foreground mt-1.5">
          <span>{nights > 0 ? `${nights}박 × ${guests}명` : "날짜를 선택해 주세요"}</span>
          <span className="font-semibold text-foreground">
            {nights > 0 ? `${nights}박 · ${guests}명` : "—"}
          </span>
        </div>
        <div className="border-t border-border my-4" />
        <div className="flex items-center justify-between">
          <span className="font-bold">총 결제 금액</span>
          <span className="text-2xl font-extrabold text-primary tabular-nums">{fmtWon(total)}</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          카드 결제 없음 · 안내된 계좌로 카카오페이/토스/은행앱 송금 후 관리자가 입금을 확인하면 예약이 확정됩니다.
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-danger">{error}</p>}
        <button className="btn-primary w-full mt-4 !py-4 text-base" onClick={submit} disabled={submitting || nights < 1 || blockedNights > 0}>
          {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : blockedNights > 0 ? "휴무일 포함 — 날짜를 바꿔주세요" : "예약 신청하고 입금하기"}
        </button>
      </div>
    </div>
  );
}
