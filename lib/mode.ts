// ─────────────────────────────────────────────────────────────
//  실행 모드 판별
//  - Supabase 환경변수가 있으면 운영 모드 (실DB)
//  - 없으면 데모 모드 (로컬 JSON 파일 저장소)
//  코드는 lib/store.ts 의 통합 인터페이스만 사용 → 어디서든 교체 가능
// ─────────────────────────────────────────────────────────────

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
export const SUPABASE_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isDemoMode = !(SUPABASE_URL && SUPABASE_ANON && SUPABASE_SERVICE);

/** Vercel(서버리스)에서 실행 중인지 — 배포 플랫폼이 자동 주입하는 값 */
export const IS_VERCEL = process.env.VERCEL === "1";

export const MODE_LABEL = isDemoMode
  ? IS_VERCEL
    ? "⚠ 데모 모드 — 데이터가 저장되지 않습니다 (Supabase 환경변수 연결 필요)"
    : "데모 모드 (로컬 파일 DB)"
  : "Supabase 운영 모드 (Vercel Serverless)";
