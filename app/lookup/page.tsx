"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Copy, Search, Star } from "lucide-react";
import { fmtDateKorean, fmtWon } from "@/lib/format";
import { STATUS_LABEL, type Reservation, type ReservationStatus, type Settings } from "@/types";
import ShareReservation from "@/components/ShareReservation";

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: "bg-warning/10 text-warning border border-warning/20",
  confirmed: "bg-success/10 text-success border border-success/20",
  cancelled: "bg-danger/10 text-danger border border-danger/20",
  completed: "bg-muted text-muted-foreground border border-border/40",
};

/**
 * 예약 조회·취소·후기 — 예약코드 없이 "예약자 이름 + 연락처"로 조회
 * 투숙완료 예약은 별점+한줄평 후기를 남길 수 있습니다.
 */
export default function LookupPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<Reservation[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<Settings | null>(null);
  useEffect(() => {
    fetch("/api/settings").then((r) => (r.ok ? r.json() : null)).then((d) => setSettings(d?.settings ?? null)).catch(() => {});
  }, []);

  // 예약 수정 상태 (입금대기 예약만 — 입금확정 후에는 수정 불가 정책)
  const [editTarget, setEditTarget] = useState<Reservation | null>(null);
  const [editIn, setEditIn] = useState("");
  const [editOut, setEditOut] = useState("");
  const [editGuests, setEditGuests] = useState("");
  const [editBusy, setEditBusy] = useState(false);
  const [editMsg, setEditMsg] = useState("");

  // 후기 작성 상태
  const [reviewCode, setReviewCode] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewedCodes, setReviewedCodes] = useState<Set<string>>(new Set());

  // 후기 요청 링크(?code=PB-XXXX) — 조회 후 해당 예약의 후기 폼 자동 오픈
  const [deepLinkCode, setDeepLinkCode] = useState("");
  useEffect(() => {
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setDeepLinkCode(c.trim().toUpperCase());
  }, []);

  async function lookup() {
    setError(""); setNotFound(false); setLoading(true);
    try {
      const res = await fetch("/api/reservations/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });
      if (res.status === 404) { setResults(null); setNotFound(true); return; }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "조회 중 오류가 발생했습니다.");
      setResults(data.reservations);
      setRating(0); setComment(""); setReviewMsg("");
      // 후기 요청 링크로 진입한 경우 — 해당 투숙완료 예약의 후기 폼을 바로 열어줌
      const target = (data.reservations as Reservation[]).find((x) => x.code.toUpperCase() === deepLinkCode && x.status === "completed");
      setReviewCode(target ? target.code : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function cancel(r: Reservation) {
    if (!confirm("예약을 취소하시겠습니까? 입금하신 금액은 관리자가 확인 후 환불 처리합니다.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/reservations/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "취소 중 오류가 발생했습니다.");
      await lookup(); // 목록 갱신
    } catch (e) {
      setError(e instanceof Error ? e.message : "오류가 발생했습니다.");
      setLoading(false);
    }
  }

  const editNights = (a: string, b: string) =>
    Math.max(0, Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 86400000));

  /** 예약자 수정 — pending만, 서버에서 정원/휴무일 재검증 + 관리자 푸시 발송 */
  async function saveEdit() {
    if (!editTarget) return;
    const g = Number(editGuests) || 0;
    const n = editNights(editIn, editOut);
    if (n < 1) return setEditMsg("체크아웃은 체크인 다음 날이어야 합니다.");
    if (g < 1) return setEditMsg("투숙 인원을 확인해 주세요.");
    if (!confirm(`예약을 수정할까요?\n→ ${editIn} ~ ${editOut} · ${n}박 · ${g}명\n총액 ${(editTarget.per_person_price * g * n).toLocaleString()}원`)) return;
    setEditBusy(true); setEditMsg("");
    try {
      const res = await fetch("/api/reservations/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editTarget.id, phone: phone.trim(), check_in: editIn, check_out: editOut, guests: g }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "수정 실패");
      setEditTarget(null);
      await lookup();
    } catch (e) {
      setEditMsg(e instanceof Error ? e.message : "수정 실패");
    } finally {
      // 성공·실패 무관 busy 항상 리셋 — 저장 성공 후 재진입 시 "저장 중…" 프리징 방지
      setEditBusy(false);
    }
  }

  async function submitReview(code: string) {
    setReviewMsg("");
    if (!rating) return setReviewMsg("별점을 선택해 주세요.");
    if (!comment.trim()) return setReviewMsg("한 줄 후기를 입력해 주세요.");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, phone: phone.trim(), rating, comment: comment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 이미 등록된 후기(409)도 감사 인사로 처리
        if (res.status === 409) {
          setReviewedCodes((s) => new Set(s).add(code));
          setReviewCode(null);
          return;
        }
        throw new Error(data.error || "후기 등록 실패");
      }
      setReviewedCodes((s) => new Set(s).add(code));
      setReviewCode(null);
    } catch (e) {
      setReviewMsg(e instanceof Error ? e.message : "후기 등록 실패");
    }
  }

  function buildNotice(r: Reservation, origin: string): string {
    return [
      `[${settings?.pension_name ?? "펜션"}] 예약 확인`,
      `- 예약코드: ${r.code}`,
      `- 일정: ${r.check_in} ~ ${r.check_out} (${r.nights}박)`,
      `- 인원: ${r.guests}명`,
      `- 금액: ${r.total_amount.toLocaleString()}원`,
      settings?.bank_name && `- 입금: ${settings.bank_name} ${settings.account_number} (${settings.account_holder})`,
      settings?.contact_phone && `- 문의: ${settings.contact_phone}`,
      settings?.address && `- 주소: ${settings.address}`,
      `- 예약 조회·수정: ${origin}/lookup`,
    ].filter(Boolean).join("\n");
  }
  function shortNotice(r: Reservation): string {
    return `[${settings?.pension_name ?? "펜션"}] 예약 ${STATUS_LABEL[r.status]} · ${r.code} · ${r.check_in} ~ ${r.check_out} (${r.nights}박, ${r.guests}명)` +
      (settings?.contact_phone ? ` · 문의 ${settings.contact_phone}` : "");
  }

  return (
    <main className="max-w-lg mx-auto px-5 pb-16">
      <div className="py-5 flex items-center gap-3">
        <Link href="/" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-black">예약 조회·취소</h1>
      </div>

      <div className="card-surface p-5 space-y-4">
        <p className="text-xs text-muted-foreground -mt-1">
          예약 시 입력한 <b>이름과 연락처</b>로 조회합니다. 예약코드를 몰라도 괜찮아요.
        </p>
        <div>
          <label className="label">예약자 이름</label>
          <input className="input" placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">연락처</label>
          <input className="input" type="tel" inputMode="tel" placeholder="010-1234-5678" value={phone}
            onChange={(e) => setPhone(e.target.value)} />
        </div>
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
        {notFound && (
          <p className="text-sm font-semibold text-warning">일치하는 예약이 없습니다. 예약 때 사용한 이름과 연락처를 확인해 주세요.</p>
        )}
        <button className="btn-primary w-full" onClick={lookup} disabled={loading || !name.trim() || !phone.trim()}>
          {loading ? "조회 중…" : (<><Search className="w-4 h-4" /> 내 예약 찾기</>)}
        </button>
      </div>

      {results && results.length > 0 && (
        <div className="mt-4 space-y-3">
          <p className="text-sm font-bold">{results.length}건의 예약을 찾았습니다</p>
          {results.map((r) => {
            const cancellable = r.status === "pending" || r.status === "confirmed";
            const shareable = r.status === "pending" || r.status === "confirmed";
            return (
              <div key={r.id} className="card-surface p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-extrabold tabular-nums text-sm">{r.code}</span>
                  <span className={`badge ${STATUS_STYLE[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                </div>
                <dl className="text-sm space-y-2">
                  <div className="flex justify-between"><dt className="text-muted-foreground">투숙 기간</dt><dd className="font-semibold text-right">{fmtDateKorean(r.check_in)} ~ {fmtDateKorean(r.check_out).slice(6)} · {r.nights}박</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">인원</dt><dd className="font-semibold">{r.guests}명</dd></div>
                  <div className="flex justify-between"><dt className="text-muted-foreground">금액</dt><dd className="font-extrabold text-primary">{fmtWon(r.total_amount)}</dd></div>
                </dl>

                {r.status === "pending" && settings?.bank_name && (
                  <div className="mt-3 rounded-xl bg-primary-soft border border-primary/10 px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">은행</span>
                      <span className="font-bold">{settings.bank_name}({settings.account_holder})</span>
                    </div>
                    {/* 계좌번호 한 줄 전체 폭 — 금융앱 붙여넣기를 위해 번호만 복사 */}
                    <div className="flex items-center justify-between gap-3 border-t border-primary/10 pt-2">
                      <span className="text-lg font-extrabold tabular-nums tracking-tight truncate">{settings.account_number}</span>
                      <AccountChip account={settings.account_number} />
                    </div>
                  </div>
                )}

                {shareable && (
                  <div className="mt-4 space-y-2">
                    <ShareReservation text={buildNotice(r, typeof window !== "undefined" ? window.location.origin : "")} short={shortNotice(r)} />
                    {r.status === "pending" && settings?.bank_name && (
                      // 토스 단독 — 카카오페이는 개인 계좌 송금 딥링크 미제공으로 오류 이슈 → 제거 (2026-09)
                      <a className="btn w-full bg-[#3182f6] text-white hover:brightness-110"
                        href={`supertoss://send?bank=${encodeURIComponent(settings.bank_name)}&accountNo=${encodeURIComponent(settings.account_number.replace(/-/g, ""))}&amount=${r.total_amount}`}>
                        토스 송금
                      </a>
                    )}
                  </div>
                )}
                {cancellable && (
                  <div className="flex gap-2 mt-3">
                    {r.status === "pending" && (
                      <button className="btn-outline flex-1" onClick={() => { setEditTarget(r); setEditIn(r.check_in); setEditOut(r.check_out); setEditGuests(String(r.guests)); setEditMsg(""); }}>
                        날짜·인원 수정
                      </button>
                    )}
                    <button className="btn-danger flex-1" onClick={() => cancel(r)} disabled={loading}>
                      이 예약 취소하기
                    </button>
                  </div>
                )}

                {/* 수정 폼 — 입금대기 예약만 노출 */}
                {editTarget?.id === r.id && (
                  <div className="mt-3 rounded-xl border border-primary/20 bg-primary-soft/40 p-4 space-y-3">
                    <p className="text-sm font-bold">예약 수정 <span className="text-muted-foreground font-medium">입금 확인 전까지 자유롭게 변경할 수 있어요</span></p>
                    <div className="grid grid-cols-2 gap-2">
                      <div><label className="label">체크인</label><input type="date" className="input" value={editIn} onChange={(e) => setEditIn(e.target.value)} /></div>
                      <div><label className="label">체크아웃</label><input type="date" className="input" value={editOut} onChange={(e) => setEditOut(e.target.value)} /></div>
                    </div>
                    <div><label className="label">투숙 인원</label>
                      <input type="text" inputMode="numeric" className="input max-w-[110px]" value={editGuests} onChange={(e) => setEditGuests(e.target.value.replace(/\D/g, "").slice(0, 3))} />
                    </div>
                    <div className="flex justify-between text-sm bg-primary-soft text-foreground rounded-lg px-3 py-2">
                      <span className="text-muted-foreground">{editNights(editIn, editOut)}박 · {Number(editGuests) || 0}명</span>
                      <b className="text-primary tabular-nums">{fmtWon(editTarget.per_person_price * (Number(editGuests) || 0) * editNights(editIn, editOut))}</b>
                    </div>
                    {editMsg && <p className="text-xs font-semibold text-danger">{editMsg}</p>}
                    <div className="grid grid-cols-2 gap-2">
                      <button className="btn-primary !py-2.5 text-sm" onClick={saveEdit} disabled={editBusy}>{editBusy ? "저장 중…" : "수정 저장"}</button>
                      <button className="btn-soft !py-2.5 text-sm" onClick={() => setEditTarget(null)}>그만두기</button>
                    </div>
                  </div>
                )}
                {r.status === "pending" && (
                  <p className="mt-3 rounded-xl bg-warning/10 border border-warning/20 px-4 py-2.5 text-xs font-semibold text-warning">
                    아직 입금 확인 전입니다 — 총 {fmtWon(r.total_amount)} 입금 후 관리자 확인 시 확정됩니다.
                  </p>
                )}

                {/* 투숙완료 → 후기 작성 */}
                {r.status === "completed" && (
                  reviewedCodes.has(r.code) || reviewCode === r.code ? (
                    reviewCode === r.code ? (
                      <div className="mt-4 rounded-xl bg-primary-soft/60 border border-primary/10 p-4 space-y-3">
                        <p className="text-sm font-bold">투숙은 어떠셨나요?</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((i) => (
                            <button key={i} onClick={() => setRating(i)} aria-label={`${i}점`}>
                              <Star className={`w-7 h-7 text-amber-400 transition-transform hover:scale-110 ${i <= rating ? "fill-current" : "fill-none opacity-30"}`} />
                            </button>
                          ))}
                        </div>
                        <textarea className="input min-h-[72px] resize-none"
                          placeholder="편했던 점, 아쉬웠던 점을 한 줄로 남겨주세요."
                          value={comment} onChange={(e) => setComment(e.target.value)} />
                        {reviewMsg && <p className="text-xs font-semibold text-danger">{reviewMsg}</p>}
                        <div className="grid grid-cols-2 gap-2">
                          <button className="btn-outline !py-2.5 text-sm" onClick={() => setReviewCode(null)}>취소</button>
                          <button className="btn-primary !py-2.5 text-sm" onClick={() => submitReview(r.code)}>후기 등록</button>
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-xl bg-success/10 border border-success/20 px-4 py-2.5 text-xs font-semibold text-success">
                        소중한 후기 감사합니다! 메인페이지에 소개되어 다른 손님에게 도움이 됩니다.
                      </p>
                    )
                  ) : (
                    <button className="btn-soft w-full mt-4" onClick={() => { setReviewCode(r.code); setRating(0); setComment(""); setReviewMsg(""); }}>
                      <Star className="w-4 h-4" /> 투숙 후기 남기기
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </main>
  );
}

/** 계좌번호 복사 칩 — 금융앱에 바로 붙여넣을 수 있도록 계좌번호만 복사 */
function AccountChip({ account }: { account: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label="계좌번호 복사"
      title="계좌번호만 복사됩니다"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(account);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch { /* 클립보드 권한 없음 */ }
      }}
      className={`shrink-0 inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-xs font-bold transition active:scale-95 ${
        copied ? "bg-success/10 text-success border-success/20" : "bg-background text-foreground border-border hover:bg-muted"
      }`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "복사됨" : "복사"}
    </button>
  );
}
