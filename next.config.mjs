/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Supabase Storage / 로컬 업로드 이미지를 <img>로 바로 사용 (Next 이미지 최적화 미사용)
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
