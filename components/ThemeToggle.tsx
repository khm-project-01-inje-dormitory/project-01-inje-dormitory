"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";

/**
 * 라이트/다크모드 토글 — 우상단 플로팅 글래스 버튼
 * 첫 방문은 OS 설정 자동 감지, 토글 시 선택 기억(localStorage).
 * 관리자 페이지(/admin)에서는 헤더와 겹치지 않도록 자동 숨김.
 */
export default function ThemeToggle() {
  const pathname = usePathname();
  const [dark, setDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch { /* 사생활 보호 모드 등 */ }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", next ? "#1f1b17" : "#9a4c16");
  }

  if (pathname?.startsWith("/admin") || !mounted) return null;

  return (
    <button type="button" onClick={toggle} aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="fixed top-4 right-4 z-50 w-11 h-11 rounded-full inline-flex items-center justify-center
        bg-background/70 text-foreground border border-border/40 shadow-card backdrop-blur
        transition-all duration-200 hover:scale-105 hover:bg-background/90 active:scale-95
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40">
      <Sun className={`absolute w-5 h-5 transition-all duration-300 ${dark ? "rotate-0 scale-100" : "-rotate-90 scale-0"}`} />
      <Moon className={`absolute w-5 h-5 transition-all duration-300 ${dark ? "rotate-90 scale-0" : "rotate-0 scale-100"}`} />
    </button>
  );
}
