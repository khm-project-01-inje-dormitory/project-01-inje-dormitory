"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Check, Copy, Download, Loader2, Pencil, Search, X, XCircle, ArrowUpDown, ChevronDown, Undo2, Trash2 } from "lucide-react";
import EditReservationDialog from "./EditReservationDialog";
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
  const [q, setQRaw] = useState(() => loadPref("q", ""));
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  function loadPref<T>(key: string, fallback: T): T {
    if (typeof window === "undefined") return fallback;
    try { return (window.sessionStorage.getItem("rt_" + key) as T) ?? fallback; } catch { return fallback; }
  }
  const savePref = (key: string, v: string) => { try { window.sessionStorage.setItem("rt_" + key, v); } catch {} };
  const [statusFilter, setStatusFilterRaw] = useState<"all" | ReservationStatus>(() => loadPref("status", "all" as "all" | ReservationStatus));
  const [sortKey, setSortKeyRaw] = useState<"newest" | "checkin" | "amount_desc" | "amount_asc">(() => loadPref("sort", "newest" as "newest" | "checkin" | "amount_desc" | "amount_asc"));
  const [visible, setVisibleRaw] = useState(20);
  const [hiddenRows, setHiddenRows] = useState<Reservation[]>([]);
  const [showHidden, setShowHidden] = useState(false);

  const setStatusFilter = (v: "all" | ReservationStatus) => { setStatusFilterRaw(v); savePref("status", v); };
  const setSortKey = (v: typeof sortKey) => { setSortKeyRaw(v); savePref("sort", v); setVisibleRaw(20); };
  const setQ = (v: string) => { setQRaw(v); savePref("q", v); };

  /** 숨김 예약 복원 — 복원 시점에 해당 기간 정원 재검사해 초과면 경고 */
  async function restoreHidden(r: Reservation) {
    const nights: string[] = [];
    for (let d = new Date(r.check_in + "T00:00:00"); d < new Date(r.check_out + "T00:00:00"); d.setDate(d.getDate() + 1))
      nights.push(d.toISOString().slice(0, 10));
    const busy = nights.reduce((mx, n) => Math.max(mx,
      rows.filter((o) => o.id !== r.id && o.status !== "cancelled" && o.check_in <= n && n < o.check_out)
        .reduce((sum, o) => sum + o.guests, 0)), 0);
    const over = settings && busy + r.guests > settings.max_guests;
    const msg = over
      ? `복원하면 ${r.check_in} 밤 기준 최대 ${busy + r.guests}명이 수용 인원(${settings?.max_guests}명)을 초과합니다. 그래도 복원할까요?`
      : `숨김을 해제하고 목록으로 복원할까요? (${r.guest_name} · ${r.check_in} ~ ${r.check_out})`;
    if (!confirm(msg)) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/reservations/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ restore: true }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "복원 실패");
      setShowHidden(false);
      await load();
      onChanged?.();
    } catch (e) { alert(e instanceof Error ? e.message : "복원 중 오류가 발생했습니다."); }
    finally { setBusyId(null); }
  }

  /** 영구삭제 — 되돌릴 수 없음, 더블 확인 */
  async function purgeHidden(r: Reservation) {
    if (!confirm(`영구삭제하면 예약 데이터가 완전히 사라지고 복구할 수 없습니다. (감사로그만 남습니다)\n${r.guest_name} · ${r.code} — 계속할까요?`)) return;
    if (!confirm("정말 영구삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.")) return;
    setBusyId(r.id);
    try {
      const res = await fetch(`/api/reservations/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ purge: true }) });
      if (!res.ok) throw new Error((await res.json()).error ?? "영구삭제 실패");
      await load();
      onChanged?.();
    } catch (e) { alert(e instanceof Error ? e.message : "영구삭제 중 오류가 발생했습니다."); }
    finally { setBusyId(null); }
  }

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
      try {
        const h = await fetch("/api/reservations/hidden");
        if (h.ok) setHiddenRows((await h.json()).reservations ?? []);
      } catch { setHiddenRows([]); }
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
    let list = statusFilter === "all" ? rows : rows.filter((r) => r.status === statusFilter);
    const t = q.trim().toLowerCase();
    if (t) list = list.filter((r) =>
      [r.guest_name, r.phone, r.code, r.depositor].some((s) => s.toLowerCase().includes(t))
    );
    const by: Record<typeof sortKey, (a: Reservation, b: Reservation) => number> = {
      newest: (a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""),
      checkin: (a, b) => (a.check_in + a.check_out).localeCompare(b.check_in + b.check_out),
      amount_desc: (a, b) => b.total_amount - a.total_amount,
      amount_asc: (a, b) => a.total_amount - b.total_amount,
    };
    return [...list].sort(by[sortKey]);
  }, [rows, q, statusFilter, sortKey]);
  const shown = filtered.slice(0, visible);

  if (loading) {
    return <div className="card-surface p-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>;
  }

  return (
    <div className="space-y-3">
      {/* 상태별 카운터 칩 — 눌러서 필터 (활성 칩 강조) */}
      <div className="flex flex-wrap items-center gap-2 mb-4" role="group" aria-label="상태 필터">
        <button type="button" onClick={() => setStatusFilter("all")}
          aria-pressed={statusFilter === "all"}
          className={`badge border transition-all duration-200 select-none cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95 ${
            statusFilter === "all"
              ? "border-border bg-foreground text-background shadow-sm"
              : "border-border bg-card text-muted-foreground"}`}>
          전체 {rows.length}건
        </button>
        {([["pending", "bg-amber-50 text-amber-700 border-amber-200", "bg-amber-400 border-amber-300 text-amber-950 shadow-sm ring-2 ring-amber-200"],
           ["confirmed", "bg-sky-50 text-sky-700 border-sky-200", "bg-sky-500 border-sky-400 text-white shadow-sm ring-2 ring-sky-200"],
           ["completed", "bg-emerald-50 text-emerald-700 border-emerald-200", "bg-emerald-500 border-emerald-400 text-white shadow-sm ring-2 ring-emerald-200"],
           ["cancelled", "bg-rose-50 text-rose-700 border-rose-200", "bg-rose-500 border-rose-400 text-white shadow-sm ring-2 ring-rose-200"]] as const).map(([k, idle, active]) => {
          const count = rows.filter((r) => r.status === k).length;
          const on = statusFilter === k;
          return (
            <button key={k} type="button" onClick={() => setStatusFilter(on ? "all" : k)}
              aria-pressed={on} disabled={!on && count === 0}
              title={on ? "필터 해제" : `${STATUS_LABEL[k]}만 보기`}
              className={`badge border transition-all duration-200 select-none cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100 ${
                on ? active : idle}`}>
              {STATUS_LABEL[k]} {count}건{on && count > 0 ? " ✓" : ""}
            </button>
          );
        })}
        {hiddenRows.length > 0 && (
          <button type="button" onClick={() => setShowHidden(!showHidden)} aria-pressed={showHidden}
            title={showHidden ? "숨김 보관함 닫기" : "숨김된 예약 보기"}
            className={`badge border transition-all duration-200 select-none cursor-pointer hover:scale-[1.04] hover:shadow-sm active:scale-95 ${
              showHidden ? "bg-slate-600 border-slate-500 text-white shadow-sm ring-2 ring-slate-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
            숨김 {hiddenRows.length}건{showHidden ? " ✓" : ""}
          </button>
        )}
      </div>
      <div className="flex items-center gap-3 flex-wrap">
        <h2 className="font-black">{mode === "pending" ? "입금 대기 예약" : `전체 예약 ${rows.length}건`}</h2>
        {mode === "all" && (
          <label className="relative inline-flex items-center">
            <ArrowUpDown className="w-3.5 h-3.5 absolute left-2.5 pointer-events-none text-muted-foreground" />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              aria-label="정렬 기준"
              className="appearance-none input !py-2 !pl-8 !pr-8 text-sm cursor-pointer bg-card">
              <option value="newest">최근 신청순</option>
              <option value="checkin">투숙 임박순</option>
              <option value="amount_desc">금액 높은순</option>
              <option value="amount_asc">금액 낮은순</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 pointer-events-none text-muted-foreground" />
          </label>
        )}
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

      {showHidden ? (
        hiddenRows.length === 0 ? (
          <div className="card-surface p-10 text-center text-muted-foreground">숨김된 예약이 없습니다.</div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground px-1">숨김된 예약 {hiddenRows.length}건 — 복원하면 목록으로 돌아갑니다. (숨김·복원 모두 감사로그에 기록됩니다)</p>
            {hiddenRows.map((r) => (
              <div key={r.id} className="card-surface p-4 sm:px-5">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <b className="text-[15px]">{r.guest_name}</b>
                      <span className="text-xs text-muted-foreground">{r.code}</span>
                      <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {r.check_in} ~ {r.check_out} · {r.guests}명 · {r.total_amount.toLocaleString()}원
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="btn-primary !py-2 !px-4 text-sm inline-flex items-center gap-1.5" disabled={busyId === r.id}
                      onClick={() => restoreHidden(r)}>
                      <Undo2 className="w-4 h-4" /> 목록으로 복원
                    </button>
                    <button className="btn-danger !py-2 !px-4 text-sm inline-flex items-center gap-1.5" disabled={busyId === r.id}
                      onClick={() => purgeHidden(r)}>
                      <Trash2 className="w-4 h-4" /> 영구삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <div className="card-surface p-10 text-center text-muted-foreground">
          {mode === "pending" ? "입금 대기 중인 예약이 없습니다. 👍" : statusFilter !== "all" ? `${STATUS_LABEL[statusFilter]} 예약이 없습니다.` : "예약이 없습니다."}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="card-surface p-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="text-[15px]">{r.guest_name}</b>
                    {(sortKey === "checkin" || true) && r.check_in === todayKST() && r.status !== "cancelled" && r.status !== "completed" && (
                      <span className="badge bg-rose-500 text-white border border-rose-400 !py-0.5 !px-2 text-[10px]">오늘 체크인</span>
                    )}
                    {r.check_in === shiftDate(1) && r.status !== "cancelled" && r.status !== "completed" && (
                      <span className="badge bg-amber-100 text-amber-800 border border-amber-300 !py-0.5 !px-2 text-[10px]">내일 체크인</span>
                    )}
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
                      <button className="btn-outline !py-2 !px-4 text-sm" onClick={() => setEditTarget(r)}>
                        <Pencil className="w-4 h-4" /> 수정
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
<ProgressTrack status={r.status} />
            {editTarget?.id === r.id && <EditReservationDialog reservation={r} onClose={() => setEditTarget(null)} onSaved={load} />}
            </div>
          ))}
        </div>
      )}
      {!showHidden && filtered.length > shown.length && (
        <div className="flex flex-col items-center gap-1.5 mt-4 mb-2">
          <button type="button" onClick={() => setVisibleRaw((v) => v + 20)} className="btn-outline !py-2.5 !px-6 text-sm">
            더 보기 <span className="text-muted-foreground font-normal">(남은 {filtered.length - shown.length}건)</span>
          </button>
          <p className="text-xs text-muted-foreground">총 {filtered.length}건 중 {shown.length}건 표시</p>
        </div>
      )}
    </div>
  );
}

function shiftDate(days: number): string {
  const d = new Date(Date.now() + 9 * 3600000 + days * 86400000);
  return d.toISOString().slice(0, 10);
}

/** 예약 진행 단계 — 입금대기 → 예약확정 → 투숙완료 (취소는 진행 중단 표시) */
const STAGES: { key: ReservationStatus; label: string }[] = [
  { key: "pending", label: "입금대기" },
  { key: "confirmed", label: "예약확정" },
  { key: "completed", label: "투숙완료" },
];

function ProgressTrack({ status }: { status: ReservationStatus }) {
  if (status === "cancelled") {
    return (
      <div className="mt-4 pt-3 border-t border-border" aria-label="취소된 예약">
        <div className="relative h-1.5 rounded-full bg-muted">
          <span className="absolute top-1/2 -translate-y-1/2 left-0 w-3 h-3 rounded-full bg-destructive ring-2 ring-background" />
        </div>
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-semibold text-destructive">
          <XCircle className="w-3 h-3 shrink-0" /> 취소 — 진행 중단
        </div>
      </div>
    );
  }
  const idx = STAGES.findIndex((s) => s.key === status);
  const pct = (idx / (STAGES.length - 1)) * 100;
  const fill = idx === 0 ? "bg-amber-400" : idx === 1 ? "bg-primary" : "bg-emerald-500";
  const tone = idx === 0 ? "text-amber-500" : idx === 1 ? "text-primary" : "text-emerald-600";
  return (
    <div className="mt-4 pt-3 border-t border-border" aria-label={`예약 진행: ${STATUS_LABEL[status]}`}>
      <div className="relative h-1.5 rounded-full bg-muted">
        <div className={`absolute inset-y-0 left-0 rounded-full ${fill} transition-all duration-500 ease-out`} style={{ width: `${pct}%` }} />
        {STAGES.map((s, i) => (
          <span key={s.key}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full transition-colors duration-500 ${i <= idx ? `${fill} ring-2 ring-background` : "bg-muted border border-border"}`}
            style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }} />
        ))}
      </div>
      <div className="relative mt-1.5 h-3">
        {STAGES.map((s, i) => (
          <span key={s.key}
            className={`absolute -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold ${i <= idx ? tone : "text-muted-foreground/50"}`}
            style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}>
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
