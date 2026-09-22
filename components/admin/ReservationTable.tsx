"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Check, Copy, Download, Loader2, Search, X } from "lucide-react";
import { fmtDateKorean, fmtDateTime, fmtWon, todayKST } from "@/lib/format";
import { REFUND_LABEL, STATUS_LABEL, type Reservation, type RefundStatus, type Settings, type ReservationStatus } from "@/types";

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-warning border border-amber-200",
  confirmed: "bg-emerald-50 text-success border border-emerald-200",
  cancelled: "bg-rose-50 text-danger border border-rose-200",
  completed: "bg-slate-100 text-slate-600 border border-slate-200",
};

const REFUND_STYLE: Record<RefundStatus, string> = {
  none: "",
  pending: "bg-rose-50 text-danger border border-rose-200",
  done: "bg-emerald-50 text-success border border-emerald-200",
};

/** 예약관리(all) / 입금확인(pending) 공용 테이블 — 카톡 안내문 복사·환불 관리·CSV 내보내기 포함 */
export default function ReservationTable({
  mode,
  onChanged,
  settings,
}: {
  mode: "all" | "pending";
  onChanged?: () => void;
  settings: Settings | null;
}) {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // CSV 내보내기 기간 (기본: 3개월 전 ~ 6개월 후)
  const [expFrom, setExpFrom] = useState(shiftDate(-90));
  const [expTo, setExpTo] = useState(shiftDate(180));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reservations");
      const data = await res.json();
      let list: Reservation[] = data.reservations ?? [];
      if (mode === "pending") list = list.filter((r) => r.status === "pending");
      setRows(list);
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => { load(); }, [load]);

  async function patch(id: string, patchBody: Record<string, unknown>, confirmText?: string) {
    if (confirmText && !confirm(confirmText)) return;
    setBusyId(id);
    try {
      await fetch(`/api/reservations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patchBody),
      });
      await load();
      onChanged?.();
    } finally {
      setBusyId(null);
    }
  }

  /** 손님과의 카톡에 바로 붙여넣을 수 있는 예약 안내 문구 복사 */
  async function copyNotice(r: Reservation) {
    const s = settings;
    const text = [
      `[${s?.pension_name ?? "펜션"}] 예약 안내드립니다.`,
      ``,
      `■ ${r.guest_name}님 (예약코드 ${r.code})`,
      `· 투숙: ${r.check_in} ~ ${r.check_out} (${r.nights}박 / ${r.guests}명)`,
      `· 입금 계좌: ${s?.bank_name ?? ""} ${s?.account_number ?? ""} ${s?.account_holder ?? ""}`,
      `· 입금 금액: ${r.total_amount.toLocaleString("ko-KR")}원 (입금자 ${r.depositor})`,
      `· 체크인 ${s?.check_in_time ?? "15:00"} / 체크아웃 ${s?.check_out_time ?? "11:00"}`,
      ``,
      `입금 확인 후 예약이 확정됩니다. 취소·조회는 홈페이지 하단 '예약 조회'에서 이름과 연락처로 가능합니다.`,
      s?.contact_phone ? `문의: ${s.contact_phone}` : "",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(r.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      /* 클립보드 권한 없음 */
    }
  }

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return rows;
    return rows.filter((r) =>
      [r.guest_name, r.phone, r.code, r.depositor].some((s) => s.toLowerCase().includes(t))
    );
  }, [rows, q]);

  if (loading) {
    return <div className="card-surface p-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-black">{mode === "pending" ? "입금 대기 예약" : `전체 예약 ${rows.length}건`}</h2>
        {mode === "all" && (
          <>
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input className="input !pl-9 !py-2 text-sm" placeholder="이름·전화·예약코드 검색" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <input type="date" className="input !py-1.5 !px-2.5 text-xs w-[135px]" value={expFrom} onChange={(e) => setExpFrom(e.target.value)} />
              <span className="text-xs text-muted-foreground">~</span>
              <input type="date" className="input !py-1.5 !px-2.5 text-xs w-[135px]" value={expTo} onChange={(e) => setExpTo(e.target.value)} />
              <a className="btn-outline !py-2 !px-3 text-xs" href={`/api/reservations/export?from=${expFrom}&to=${expTo}`} download>
                <Download className="w-3.5 h-3.5" /> CSV 내려받기
              </a>
            </div>
          </>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="card-surface p-10 text-center text-muted-foreground">
          {mode === "pending" ? "입금 대기 중인 예약이 없습니다. 👍" : "예약이 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="card-surface p-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="text-[15px]">{r.guest_name}</b>
                    <span className="text-xs text-muted-foreground">{r.depositor !== r.guest_name ? `입금자: ${r.depositor}` : ""}</span>
                    <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === "cancelled" && r.refund_status !== "none" && (
                      <span className={`badge ${REFUND_STYLE[r.refund_status]}`}>{REFUND_LABEL[r.refund_status]}</span>
                    )}
                    <span className="text-[11px] tabular-nums text-muted-foreground">{r.code}</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {fmtDateKorean(r.check_in)} ~ {fmtDateKorean(r.check_out).slice(6)} · {r.nights}박 · {r.guests}명
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 tabular-nums">
                    {r.phone} · 신청 {fmtDateTime(r.created_at)}
                  </div>
                  {r.message && <div className="text-xs mt-1.5 rounded-lg bg-muted px-3 py-2">💬 {r.message}</div>}
                </div>
                <div className="text-right shrink-0">
                  <div className="font-extrabold text-primary tabular-nums">{fmtWon(r.total_amount)}</div>
                  <div className="text-[11px] text-muted-foreground">{fmtWon(r.per_person_price)}/인</div>
                </div>
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 mt-3 flex-wrap">
                {busyId === r.id ? (
                  <div className="text-muted-foreground px-3 py-2"><Loader2 className="w-4 h-4 animate-spin" /></div>
                ) : (
                  <>
                    {r.status === "pending" && (
                      <button className="btn-primary !py-2 !px-4 text-sm" onClick={() => patch(r.id, { status: "confirmed" }, "입금을 확인하고 예약을 확정하시겠습니까?")}>
                        <Check className="w-4 h-4" /> 입금확정
                      </button>
                    )}
                    {r.status === "confirmed" && (
                      <button className="btn-outline !py-2 !px-4 text-sm" onClick={() => patch(r.id, { status: "completed" }, "투숙 완료로 처리하시겠습니까?")}>
                        투숙완료
                      </button>
                    )}
                    {(r.status === "confirmed" || r.status === "pending") && (
                      <button className="btn-danger !py-2 !px-4 text-sm" onClick={() => patch(r.id, { status: "cancelled", refund_status: r.status === "confirmed" ? "pending" : "none" }, r.status === "confirmed" ? "예약을 취소하고 환불대기로 처리하시겠습니까?" : "입금 전 예약을 취소 처리하시겠습니까?")}>
                        <X className="w-4 h-4" /> 취소
                      </button>
                    )}
                    {r.status === "cancelled" && r.refund_status === "pending" && (
                      <button className="btn-primary !py-2 !px-4 text-sm" onClick={() => patch(r.id, { refund_status: "done" }, "환불을 완료 처리하시겠습니까?")}>
                        <Check className="w-4 h-4" /> 환불완료
                      </button>
                    )}
                    {r.status === "cancelled" && r.refund_status === "done" && (
                      <button className="btn-soft !py-2 !px-4 text-sm" onClick={() => patch(r.id, { refund_status: "pending" })}>
                        환불완료 해제
                      </button>
                    )}
                    {r.status === "cancelled" && (
                      <button className="btn-soft !py-2 !px-4 text-sm" onClick={() => patch(r.id, { status: "pending" }, "입금대기로 복원하시겠습니까?")}>
                        예약 복원
                      </button>
                    )}
                    {r.status === "completed" && (
                      <button className="btn-soft !py-2 !px-4 text-sm" onClick={() => patch(r.id, { status: "confirmed" }, "투숙완료를 해제하시겠습니까?")}>
                        투숙완료 해제
                      </button>
                    )}
                    {/* 최후 수단: 숨김(소프트 삭제) — 이력 보존, 복구 가능 */}
                    {r.status === "cancelled" && (
                      <button className="btn-soft !py-2 !px-4 text-xs text-muted-foreground" onClick={() => patch(r.id, { deleted_at: new Date().toISOString() } as never, "목록에서 숨길까요? (취소 이력은 DB에 보존되고 복구 가능합니다)")}>
                        숨김
                      </button>
                    )}
                    {(r.status === "pending" || r.status === "confirmed") && (
                      <button className="btn-outline !py-2 !px-4 text-sm" onClick={() => copyNotice(r)}>
                        {copiedId === r.id ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                        {copiedId === r.id ? "복사 완료!" : "안내문 복사"}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function shiftDate(days: number): string {
  const d = new Date(Date.now() + 9 * 3600000 + days * 86400000);
  return d.toISOString().slice(0, 10);
}
