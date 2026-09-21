"use client";

import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, MessageSquareQuote, Star, Trash2 } from "lucide-react";
import { fmtDateTime } from "@/lib/format";
import type { Review } from "@/types";

function Stars({ n, size = "w-3.5 h-3.5" }: { n: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5 text-amber-400">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={`${size} ${i <= n ? "fill-current" : "fill-none opacity-30"}`} />
      ))}
    </span>
  );
}

/** 후기 관리 — 노출/숨김 전환, 삭제 */
export default function ReviewsTab() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/reviews?all=1");
      const data = await res.json();
      setReviews(data.reviews ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  async function toggle(r: Review) {
    await fetch(`/api/reviews/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: !r.visible }),
    });
    load();
  }
  async function remove(r: Review) {
    if (!confirm("이 후기를 삭제하시겠습니까?")) return;
    await fetch(`/api/reviews/${r.id}`, { method: "DELETE" });
    load();
  }

  const avg = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-black flex items-center gap-2">
          <MessageSquareQuote className="w-5 h-5 text-primary" /> 손님 후기 관리
          <span className="text-sm font-medium text-muted-foreground">({reviews.length}건 · 평균 {avg || "-"})</span>
        </h2>
        <p className="text-xs text-muted-foreground">숨긴 후기는 메인페이지에 노출되지 않습니다.</p>
      </div>

      {loading ? (
        <div className="card-surface p-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : reviews.length === 0 ? (
        <div className="card-surface p-10 text-center text-muted-foreground">
          아직 후기가 없습니다. 투숙완료 예약의 손님이 '예약 조회'에서 후기를 남길 수 있습니다.
        </div>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className={`card-surface p-4 ${r.visible ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <b className="text-sm">{r.guest_name}</b>
                    <Stars n={r.rating} />
                    <span className="text-[11px] text-muted-foreground tabular-nums">{r.reservation_code} · {fmtDateTime(r.created_at)}</span>
                    {!r.visible && <span className="badge bg-slate-100 text-slate-500 border border-slate-200">숨김</span>}
                  </div>
                  <p className="text-sm mt-1.5 leading-relaxed">{r.comment}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted" onClick={() => toggle(r)}
                    title={r.visible ? "숨기기" : "노출하기"}>
                    {r.visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-rose-50 hover:text-danger" onClick={() => remove(r)} title="삭제">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
