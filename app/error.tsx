"use client";
// ─────────────────────────────────────────────────────────────
//  [v1.2b] 전역 오류 경계 — DB 일시 장애(PGRST303 등) 시 손님에게
//  투박한 500 대신 안내 화면을 보여준다. reset()이 세그먼트를
//  재렌더링해 "다시 시도"가 곧 재요청이 된다.
//  색상·간격은 §12 디자인 토큰만 사용 (하드코딩 금지).
// ─────────────────────────────────────────────────────────────

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[error-boundary]", error);
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-background px-6 text-center text-foreground">
      <div className="rounded-full bg-muted px-4 py-1.5 text-sm font-bold text-muted-foreground">
        일시적 오류
      </div>
      <h1 className="text-xl font-black">페이지를 불러오지 못했어요</h1>
      <p className="break-keep text-sm text-muted-foreground">
        서버와의 연결이 잠깐 불안정합니다.
        <br />
        아래 버튼을 눌러 다시 시도해 주세요.
      </p>
      <button
        onClick={reset}
        className="mt-2 rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground"
      >
        다시 시도
      </button>
    </main>
  );
}
