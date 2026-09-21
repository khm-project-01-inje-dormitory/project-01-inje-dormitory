"use client";

import { useCallback, useEffect, useState } from "react";
import {
  BarChart3, Banknote, CalendarCheck2, Images, Loader2, MessageSquareQuote, RefreshCw, Settings2,
} from "lucide-react";
import StatsTab from "./StatsTab";
import ReservationTable from "./ReservationTable";
import GalleryTab from "./GalleryTab";
import ReviewsTab from "./ReviewsTab";
import SettingsTab from "./SettingsTab";
import PushSetup from "@/components/PushSetup";
import { MODE_LABEL } from "@/lib/mode";
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

export default function AdminDashboard() {
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
            <p className="text-[11px] text-muted-foreground">{MODE_LABEL}</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-xl border border-border flex items-center justify-center hover:bg-muted" onClick={refresh} title="새로고침">
              <RefreshCw className="w-4 h-4" />
            </button>
            <a href="/" className="btn-soft !px-3 !py-2 text-xs">사이트 보기</a>
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
