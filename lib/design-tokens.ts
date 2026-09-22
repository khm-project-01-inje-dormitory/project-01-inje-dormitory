"use client";

import { useEffect, useState } from "react";

/**
 * 차트용 디자인 토큰 — 단일 진실원(SSOT)
 * recharts 등 SVG 라이브러리는 CSS 변수를 해석하지 못하므로 hex가 필요합니다.
 * 값은 app/globals.css의 :root / .dark 토큰과 동일하게 유지하세요.
 */
export type ChartPalette = {
  primary: string; success: string; warning: string; danger: string;
  text: string; grid: string; soft: string; card: string; fg: string;
};

const LIGHT: ChartPalette = {
  primary: "#9a4c16", success: "#057a55", warning: "#b47807", danger: "#c72d4c",
  text: "#7a6f64", grid: "#e9e2d7", soft: "#d9c9b4", card: "#ffffff", fg: "#292521",
};
const DARK: ChartPalette = {
  primary: "#e8b56a", success: "#34c791", warning: "#f5be46", danger: "#ff6f85",
  text: "#b0a698", grid: "#3b352d", soft: "#5a4d3d", card: "#25211c", fg: "#ece7de",
};

/** 현재 테마의 차트 팔레트 — 다크 클래스 전환을 감지해 자동 갱신 */
export function useChartTheme(): ChartPalette {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const el = document.documentElement;
    const update = () => setDark(el.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return dark ? DARK : LIGHT;
}

/** 차트 공통 스타일 — 축·그리드·툴팁 (토큰 기반, 차트 간 일관성) */
export function chartCommon(p: ChartPalette) {
  return {
    grid: { strokeDasharray: "3 3", stroke: p.grid, vertical: false as const },
    tick: { fontSize: 12, fill: p.text },
    tickSm: { fontSize: 11, fill: p.text },
    tooltipStyle: { borderRadius: 12, border: `1px solid ${p.grid}`, backgroundColor: p.card, color: p.fg },
  };
}
