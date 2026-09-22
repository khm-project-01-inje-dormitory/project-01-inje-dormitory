"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, Banknote, CalendarCheck2, Images, Loader2, MessageSquareQuote, RefreshCw, Settings2, LogOut } from "lucide-react";
import StatsTab from "./StatsTab";
import ReservationTable from "./ReservationTable";
import GalleryTab from "./GalleryTab";
import ReviewsTab from "./ReviewsTab";
import SettingsTab from "./SettingsTab";
import PushSetup from "@/components/PushSetup";
import type { Settings } from "@/types";

type Tab = "stats" | "reservations" | "deposits" | "gallery" | "reviews" | "settings";

const TABS: Array<[Tab, string, typeof BarChart3]> = [
  ["stats", "통계", BarChart3],
  ["reservations", "예약관리", CalendarCheck2],
  ["deposits", "입금확인", Banknote],
  ["gallery", "갤러리", Images],
  ["reviews", "후기", MessageSquareQuote],
  ["settings", "설정", Settings2],
];

/** modeLabel은 서버(AdminPage)에서 계산해 전달 — 클라이언트 번들은 service key 환경변수를 볼 수 없어 항상 데모로 표시되는 버그 수정 */
export default function AdminDashboard({ modeLabel }: { modeLabel: string }) {
  const [tab, setTab] = useState<Tab>("stats");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    fetch("/api/settings").then((r) => r.json()).then((d) => setSettings(d.settings)).catch(() => {});
    fetch("/api/stats").then((r) => r.json()).then((d) => setPendingCount(d.cards?.pendingCount ?? 0)).catch(() => {});
  }, [reloadKey]);

  return (
    <main className="min-h-screen pb-20">
      {/* 헤더 */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-lg font-black truncate">{settings?.pension_name ?? "관리자"} · 대시보드</h1>
            <p className="text-[11px] text-muted-foreground">{modeLabel}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted" onClick={refresh} title="새로고침">
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/" className="btn-soft !px-3 !py-2 text-xs">사이트 보기</a>
            <button className="btn-outline !px-3 !py-2 text-xs inline-flex items-center gap-1.5"
              onClick={async () => {
                if (!confirm("로그아웃하시겠습니까?")) return;
                try { await fetch("/api/admin/logout", { method: "POST" }); } catch { /* 네트워크 오류에도 로그인 화면으로 */ }
                window.location.href = "/admin";
              }}>
              <LogOut className="w-3.5 h-3.5" /> 로그아웃
            </button>
          </div>
        </div>
        {/* 탭 — 모바일에서 가로 스크롤 */}
        <nav className="max-w-6xl mx-auto px-4 sm:px-6 flex gap-1 overflow-x-auto">
          {TABS.map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`relative flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-bold whitespace-nowrap border-b-2 transition-colors ${
                tab === key ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === "deposits" && pendingCount > 0 && (
                <span className="absolute -top-0.5 -right-1 min-w-[18px] h-[18px] rounded-full bg-danger text-white text-[10px] font-extrabold flex items-center justify-center px-1">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 예약 ON/OFF 토글 — 헤더 바로 아래 고정 */}
        {settings && (
          <div className={`card-surface p-4 flex items-center justify-between gap-4 flex-wrap border-2 ${settings.booking_paused ? "border-warning/40 bg-warning/10" : ""}`}>
            <div className="min-w-0">
              <b className="text-sm block">예약 접수 {settings.booking_paused ? "일시 중지 중" : "정상 운영 중"}</b>
              <span className="text-xs text-muted-foreground">
                {settings.booking_paused
                  ? `예약이 차단됩니다.${settings.booking_resume_date ? ` 재개 예정: ${settings.booking_resume_date.replace(/-/g, ".")} (자동 복귀)` : " 다시 켜기 전까지 계속됩니다."}`
                  : "예약 정상 접수 중입니다."}
              </span>
            </div>
            <button
              onClick={async () => {
                const next = !settings.booking_paused;
                if (next && !confirm("예약 접수를 일시 중지할까요?\n홈·예약 페이지에서 신규 예약이 차단됩니다. (기존 예약 조회·취소는 유지)")) return;
                const res = await fetch("/api/settings", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ booking_paused: next }),
                });
                if (res.ok) refresh();
              }}
              className={`w-14 h-8 rounded-full relative transition-colors shrink-0 ${settings.booking_paused ? "bg-warning" : "bg-primary"}`}
              title={settings.booking_paused ? "예약 재개" : "예약 일시중지"}
            >
              <span className={`absolute top-0.5 w-7 h-7 rounded-full bg-white shadow transition-all ${settings.booking_paused ? "left-[26px]" : "left-0.5"}`} />
            </button>
          </div>
        )}
        <PushSetup />
        {tab === "stats" && <StatsTab key={reloadKey} onGoto={(t) => setTab(t)} />}
        {tab === "reservations" && <ReservationTable key={"r" + reloadKey} mode="all" settings={settings} onChanged={refresh} />}
        {tab === "deposits" && <ReservationTable key={"d" + reloadKey} mode="pending" settings={settings} onChanged={refresh} />}
        {tab === "gallery" && <GalleryTab key={"g" + reloadKey} />}
        {tab === "reviews" && <ReviewsTab key={"rv" + reloadKey} />}
        {tab === "settings" && (settings ? <SettingsTab key={"s" + reloadKey} settings={settings} /> : <LoadingCard />)}
      </div>
    </main>
  );
}

function LoadingCard() {
  return (
    <div className="card-surface p-10 flex items-center justify-center text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" />
    </div>
  );
}
