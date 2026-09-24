"use client";
// ─────────────────────────────────────────────────────────────
//  [v1.2b] 전역 오류 경계 — DB 일시 장애(PGRST303 등) 시 손님에게
//  투박한 500 대신 안내 화면을 보여준다.
//  기본 버튼은 하드 새로고침(location.reload) — 서버 렌더가 실패한
//  초기 로딩에서는 reset()이 확실한 재요청을 보장하지 않기 때문.
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
        새로고침으로 다시 시도해 주세요.
      </p>
      <div className="mt-2 flex items-center gap-3">
        <button
          onClick={() => window.location.reload()}
          className="rounded-full bg-primary px-6 py-3 text-sm font-black text-primary-foreground"
        >
          새로고침
        </button>
        <button
          onClick={reset}
          className="rounded-full border border-border px-5 py-3 text-sm font-bold text-foreground"
        >
          다시 시도
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        그래도 계속되면 잠시 후 다시 접속해 주세요.
      </p>
    </main>
  );
}
