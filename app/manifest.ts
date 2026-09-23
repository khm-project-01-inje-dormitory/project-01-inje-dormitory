import type { MetadataRoute } from "next";
import { store } from "@/lib/store";

// 앱 명칭·시작 화면 — 관리자 설정의 숙소명과 동기화 (설정 변경 시 앱 이름도 함께 반영)
export const dynamic = "force-dynamic";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let name = "도채골민박";
  try {
    const s = await store.getSettings();
    if (s?.pension_name) name = s.pension_name;
  } catch {
    /* 설정 로드 실패 시 기본값 사용 */
  }
  return {
    name,
    short_name: name.slice(0, 12),
    description: "1인 1박 · 집 전체 대여 민박 예약 — 입금 확인 후 확정됩니다.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#faf8f4",
    theme_color: "#9a4c16",
    lang: "ko",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "홈", short_name: "홈", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "관리자", short_name: "관리자", url: "/admin", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
