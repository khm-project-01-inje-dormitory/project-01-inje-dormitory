"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Star } from "lucide-react";
import { fmtDateKorean, fmtWon } from "@/lib/format";
import { STATUS_LABEL, type Reservation, type ReservationStatus } from "@/types";

const STATUS_STYLE: Record<ReservationStatus, string> = {
  pending: "bg-amber-50 text-warning border border-amber-200",
  confirmed: "bg-emerald-50 text-success border border-emerald-200",
  cancelled: "bg-rose-50 text-danger border border-rose-200",
  completed: "bg-slate-100 text-slate-600 border border-slate-200",
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

  // 후기 작성 상태
  const [reviewCode, setReviewCode] = useState<string | null>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewedCodes, setReviewedCodes] = useState<Set<string>>(new Set());

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
      setReviewCode(null); setRating(0); setComment(""); setReviewMsg("");
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

                {cancellable && (
                  <button className="btn-danger w-full mt-4" onClick={() => cancel(r)} disabled={loading}>
                    이 예약 취소하기
                  </button>
                )}
                {r.status === "pending" && (
                  <p className="mt-3 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2.5 text-xs font-semibold text-warning">
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
                      <p className="mt-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-xs font-semibold text-success">
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
