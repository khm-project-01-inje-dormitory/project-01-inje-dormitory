/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase Storage / 로컬 업로드 이미지를 <img>로 바로 사용 (Next 이미지 최적화 미사용)
  eslint: { ignoreDuringBuilds: true },
  // 페이지는 절대 캐시하지 않음 — 설정 변경이 홈·예약 화면에 즉시 반영되도록
  // (정적 자산 /_next/static 은 제외해야 해시 캐싱이 유지됨)
  async headers() {
    const noStore = [{ key: "Cache-Control", value: "private, no-cache, no-store, max-age=0, must-revalidate" }];
    return [
      { source: "/", headers: noStore },
      { source: "/reserve", headers: noStore },
      { source: "/reserve/:path*", headers: noStore },
      { source: "/lookup", headers: noStore },
      { source: "/admin", headers: noStore },
      { source: "/admin/:path*", headers: noStore },
    ];
  },
};

export default nextConfig;
