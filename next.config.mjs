/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase Storage / 로컬 업로드 이미지를 <img>로 바로 사용 (Next 이미지 최적화 미사용)
  eslint: { ignoreDuringBuilds: true },
  // 참고: 캐시 금지는 각 페이지/라우트의 force-dynamic + revalidate=0 + force-no-store 로 처리.
  // 여기서 headers()로 Cache-Control을 추가하면 기본 헤더와 이중으로 나가 캐시 동작이 정의불가가 되므로 쓰지 않음.
};
export default nextConfig;
