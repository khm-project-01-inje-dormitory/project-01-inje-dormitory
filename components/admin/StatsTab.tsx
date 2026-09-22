"use client";

import { useEffect, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { ArrowRight, Banknote, CalendarCheck, Clock, Users, Wallet, Repeat2, Timer, MoonStar, Undo2 } from "lucide-react";
import { fmtDateKorean, fmtDateTime, fmtWon } from "@/lib/format";
import { STATUS_LABEL, type Reservation } from "@/types";

// 차트 색은 lib/design-tokens.ts(SSOT)에서 — 라이트/다크 테마 자동 대응
import { useChartTheme, chartCommon } from "@/lib/design-tokens";

interface StatsData {
  cards: {
    monthRevenue: number; monthCount: number; monthGuests: number;
    pendingCount: number; pendingAmount: number; avgGuests: number;
    avgLeadDays: number; avgNights: number; repeatGuests: number;
    refundPendingCount: number; refundPendingAmount: number;
  };
  months: Array<{ label: string; revenue: number; count: number }>;
  weeks: Array<{ label: string; count: number }>;
  dow: Array<{ label: string; count: number }>;
  mix: { pending: number; confirmed: number; completed: number; cancelled: number };
  upcoming: Reservation[];
  recent: Reservation[];
}

export default function StatsTab({ onGoto }: { onGoto: (t: "deposits" | "reservations") => void }) {
  const [data, setData] = useState<StatsData | null>(null);

  const chart = useChartTheme();
  const cc = chartCommon(chart);

  useEffect(() => {
    fetch("/api/stats").then((r) => r.json()).then(setData).catch(() => {});
  }, []);

  if (!data) {
    return <div className="card-surface p-10 flex items-center justify-center text-muted-foreground">
      <span className="text-sm">통계를 불러오는 중…</span>
    </div>;
  }

  const c = data.cards;
  const mixData = [
    { name: "입금대기", value: data.mix.pending, color: chart.warning },
    { name: "예약확정", value: data.mix.confirmed, color: chart.success },
    { name: "투숙완료", value: data.mix.completed, color: chart.text },
    { name: "취소", value: data.mix.cancelled, color: chart.danger },
  ];

  return (
    <div className="space-y-5">
      {/* 요약 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={<Wallet className="w-5 h-5" />} label="이번 달 매출" value={fmtWon(c.monthRevenue)} tone="primary" />
        <StatCard icon={<CalendarCheck className="w-5 h-5" />} label="이번 달 예약" value={`${c.monthCount}건`} sub={`투숙 ${c.monthGuests}명 · 평균 ${c.avgGuests}명`} />
        <StatCard icon={<Clock className="w-5 h-5" />} label="입금 대기" value={`${c.pendingCount}건`} sub={fmtWon(c.pendingAmount)} tone="warning"
          action={() => onGoto("deposits")} />
        <StatCard icon={<Users className="w-5 h-5" />} label="전체 확정·완료" value={`${data.mix.confirmed + data.mix.completed}건`} />
      </div>

      {c.pendingCount > 0 && (
        <button onClick={() => onGoto("deposits")} className="w-full flex items-center justify-between rounded-card bg-amber-50 border border-amber-200 px-5 py-4 text-left hover:brightness-[0.99]">
          <div>
            <div className="font-bold text-warning">입금 확인이 필요한 예약이 {c.pendingCount}건 있습니다</div>
            <div className="text-xs text-warning/80 mt-0.5">확인 총액 {fmtWon(c.pendingAmount)}</div>
          </div>
          <ArrowRight className="w-5 h-5 text-warning" />
        </button>
      )}
      {c.refundPendingCount > 0 && (
        <button onClick={() => onGoto("reservations")} className="w-full flex items-center justify-between rounded-card bg-rose-50 border border-rose-200 px-5 py-4 text-left hover:brightness-[0.99]">
          <div>
            <div className="font-bold text-danger">환불 대기가 {c.refundPendingCount}건 있습니다 — 취소 예약의 환불을 완료 처리해 주세요</div>
            <div className="text-xs text-danger/80 mt-0.5">환불 예정액 {fmtWon(c.refundPendingAmount)}</div>
          </div>
          <ArrowRight className="w-5 h-5 text-danger" />
        </button>
      )}

      {/* 운영 인사이트 */}
      <section>
        <h3 className="font-black mb-3 text-sm text-muted-foreground">운영 인사이트</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Timer className="w-5 h-5" />} label="평균 예약 리드타임" value={c.avgLeadDays ? `${c.avgLeadDays}일` : "-"}
            sub="신청 → 체크인까지 평균 기간" hint="홍보 게시를 언제 올리면 좋은지 판단 기준" />
          <StatCard icon={<MoonStar className="w-5 h-5" />} label="평균 숙박일" value={c.avgNights ? `${c.avgNights}박` : "-"}
            sub="확정·완료 예약 기준" />
          <StatCard icon={<Repeat2 className="w-5 h-5" />} label="재방문 손님" value={`${c.repeatGuests}조`}
            sub="2회 이상 투숙한 연락처" hint="재방문이 늘면 단골 혜택 고려" />
          <StatCard icon={<Undo2 className="w-5 h-5" />} label="환불 대기" value={`${c.refundPendingCount}건`}
            sub={fmtWon(c.refundPendingAmount)} tone={c.refundPendingCount > 0 ? "warning" : "default"} />
        </div>
      </section>

      {/* 월별 매출 + 건수 */}
      <div className="card-surface p-5">
        <h3 className="font-black mb-4">최근 6개월 매출 추이</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data.months} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
              <CartesianGrid strokeDasharray={cc.grid.strokeDasharray} stroke={cc.grid.stroke} vertical={false} />
              <XAxis dataKey="label" tick={cc.tick} axisLine={false} tickLine={false} />
              <YAxis yAxisId="won" tick={cc.tick} axisLine={false} tickLine={false}
                tickFormatter={(v) => (v >= 10000 ? `${Math.round(v / 10000)}만` : v)} />
              <YAxis yAxisId="cnt" orientation="right" tick={cc.tick} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, n: string) => (n === "매출" ? fmtWon(v) : `${v}건`)} contentStyle={cc.tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="won" dataKey="revenue" name="매출" fill={chart.primary} radius={[8, 8, 0, 0]} maxBarSize={40} />
              <Line yAxisId="cnt" dataKey="count" name="예약" stroke={chart.success} strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* 주별 예약 */}
        <div className="card-surface p-5">
          <h3 className="font-black mb-4">최근 8주 예약 건수</h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.weeks} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray={cc.grid.strokeDasharray} stroke={cc.grid.stroke} vertical={false} />
                <XAxis dataKey="label" tick={cc.tick} axisLine={false} tickLine={false} />
                <YAxis tick={cc.tick} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: number) => `${v}건`} contentStyle={cc.tooltipStyle} />
                <Bar dataKey="count" name="예약" fill={chart.success} radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 요일별 + 상태 */}
        <div className="card-surface p-5">
          <h3 className="font-black mb-4">요일별 예약 분포</h3>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.dow} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <XAxis dataKey="label" tick={cc.tick} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip formatter={(v: number) => `${v}건`} contentStyle={cc.tooltipStyle} />
                <Bar dataKey="count" name="예약" radius={[6, 6, 0, 0]} maxBarSize={24}>
                  {data.dow.map((_, i) => (
                    <Cell key={i} fill={i === 5 || i === 6 ? chart.primary : chart.soft} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div>
              <h4 className="text-sm font-bold">예약 상태 분포</h4>
              <ul className="text-xs text-muted-foreground mt-1.5 space-y-0.5">
                {mixData.map((m) => (
                  <li key={m.name} className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                    {m.name} {m.value}건
                  </li>
                ))}
              </ul>
            </div>
            <div className="h-28 w-28">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mixData} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={3} strokeWidth={0}>
                    {mixData.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* 다가오는 체크인 */}
        <div className="card-surface p-5">
          <h3 className="font-black mb-3 flex items-center gap-2"><Banknote className="w-4 h-4 text-primary" /> 다가오는 체크인 (7일 내)</h3>
          {data.upcoming.length ? (
            <ul className="space-y-2">
              {data.upcoming.map((r) => (
                <li key={r.id} className="flex items-center justify-between rounded-xl bg-primary-soft/60 px-4 py-3">
                  <div className="min-w-0">
                    <div className="font-bold text-sm">{r.guest_name} <span className="text-muted-foreground font-medium">({r.depositor})</span></div>
                    <div className="text-xs text-muted-foreground">{fmtDateKorean(r.check_in)} · {r.guests}명 · {r.code}</div>
                  </div>
                  <span className="text-sm font-extrabold text-primary shrink-0 tabular-nums">{fmtWon(r.total_amount)}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-muted-foreground">7일 내 예정된 체크인이 없습니다.</p>}
        </div>

        {/* 최근 신청 */}
        <div className="card-surface p-5">
          <h3 className="font-black mb-3 flex items-center gap-2"><CalendarCheck className="w-4 h-4 text-primary" /> 최근 예약 신청</h3>
          <ul className="space-y-2">
            {data.recent.map((r) => (
              <li key={r.id} className="flex items-center justify-between px-1 py-1.5 text-sm">
                <div className="min-w-0">
                  <b>{r.guest_name}</b>
                  <span className="text-muted-foreground"> · {r.check_in.slice(5)} · {r.guests}명</span>
                </div>
                <span className="text-xs font-bold text-muted-foreground shrink-0">{fmtDateTime(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, sub, tone = "default", action, hint,
}: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  tone?: "default" | "primary" | "warning"; action?: () => void; hint?: string;
}) {
  const toneCls =
    tone === "primary" ? "bg-primary text-primary-foreground" : tone === "warning" ? "bg-amber-50 text-warning" : "bg-primary-soft text-primary";
  return (
    <div className={`card-surface p-4 sm:p-5 ${action ? "cursor-pointer hover:shadow-pop transition-shadow" : ""}`}
      onClick={action} role={action ? "button" : undefined} title={hint}>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${toneCls}`}>{icon}</div>
      <div className="mt-3 text-xs font-bold text-muted-foreground">{label}</div>
      <div className="text-xl sm:text-2xl font-black tabular-nums mt-0.5">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
