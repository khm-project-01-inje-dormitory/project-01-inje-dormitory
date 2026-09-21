import { CircleAlert, CalendarDays } from "lucide-react";
import { fmtDateKorean } from "@/lib/format";
import type { DayAvailability } from "@/types";

/**
 * 날짜별 잔여 현황 캘린더 (박 단위)
 * 남은 인원이 많을수록 잔잔한 색, 매진에 가까울수록 강한 색
 */
export default function AvailabilityCalendar({
  days,
  compact = false,
}: {
  days: DayAvailability[];
  compact?: boolean;
}) {
  if (!days.length) return null;
  const soldOut = days.filter((d) => d.remaining === 0).length;

  return (
    <div className="card-surface p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-bold">
          <CalendarDays className="w-4 h-4 text-primary" />
          예약 현황 <span className="text-muted-foreground font-medium">· 박 단위 잔여 인원</span>
        </div>
        {soldOut > 0 && (
          <span className="badge bg-rose-50 text-danger">
            <CircleAlert className="w-3.5 h-3.5" /> 매진 {soldOut}일
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {days.map((d) => {
          const ratio = d.booked + d.remaining > 0 ? d.booked / (d.booked + d.remaining) : 0;
          const tone =
            d.blocked
              ? "bg-slate-100 text-slate-500 border-slate-200"
              : d.remaining === 0
                ? "bg-rose-50 text-danger border-rose-200"
                : d.remaining <= 2
                  ? "bg-amber-50 text-warning border-amber-200"
                  : "bg-emerald-50 text-success border-emerald-100";
          return (
            <div key={d.date} className={`rounded-xl border px-3 py-2 ${tone}`}>
              <div className={compact ? "text-xs font-semibold" : "text-sm font-semibold"}>
                {fmtDateKorean(d.date).slice(5)}
              </div>
              <div className="text-[11px] font-medium opacity-80">
                {d.blocked ? "휴무" : d.remaining === 0 ? "매진" : `${d.remaining}명 가능`}
              </div>
              <div className="mt-1.5 h-1 rounded-full bg-black/5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-current opacity-40"
                  style={{ width: `${Math.round((ratio || 0) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
