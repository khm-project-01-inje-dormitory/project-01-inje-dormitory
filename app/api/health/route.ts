import { NextResponse } from "next/server";
import { isDemoMode, IS_VERCEL, SUPABASE_URL, SUPABASE_ANON, SUPABASE_SERVICE } from "@/lib/mode";

/**
 * 배포 진단용 (공개) — 설정 여부(참/거짓)만 반환하고 값은 절대 노출하지 않음.
 * 사용: 브라우저에서 https://사이트주소/api/health 열기
 * mode가 "demo"면 env 중 false인 변수가 원인. 전부 true인데 demo면 배포가 환경변수 등록 이전 빌드.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    mode: isDemoMode ? "demo" : "supabase",
    isVercel: IS_VERCEL,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: Boolean(SUPABASE_URL),
      NEXT_PUBLIC_SUPABASE_ANON_KEY: Boolean(SUPABASE_ANON),
      SUPABASE_SERVICE_ROLE_KEY: Boolean(SUPABASE_SERVICE),
    },
  });
}
