// ─────────────────────────────────────────────────────────────
//  Rate limit — 서버리스 인스턴스 메모리 기반 (외부 의존성 없음)
//  주의: Vercel Serverless는 인스턴스가 여러 개일 수 있어 완벽하지 않으나,
//  일반적인 무차별 대입/스팸 요청은 충분히 방어된다(Upstash 등 도입 전
//  안전 기준선). 인스턴스가 재시작되면 카운터도 초기화된다.
// ─────────────────────────────────────────────────────────────
import "server-only";

interface Bucket { count: number; resetAt: number }
const store = new Map<string, Bucket>();

/** 주기적으로 만료된 키를 청소 (메모리 누수 방지) */
function sweep(now: number) {
  if (store.size < 1024) return;
  for (const [k, v] of store) if (v.resetAt <= now) store.delete(k);
}

/**
 * 요청 허용 여부 판정
 * @param key    식별자 (예: "login:1.2.3.4")
 * @param limit  기간 내 허용 횟수
 * @param windowMs 기간(ms)
 * @returns { ok, remaining, resetAt }
 */
export function checkRate(key: string, limit: number, windowMs: number): { ok: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  sweep(now);
  const b = store.get(key);
  if (!b || b.resetAt <= now) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (b.count >= limit) return { ok: false, remaining: 0, resetAt: b.resetAt };
  b.count += 1;
  return { ok: true, remaining: limit - b.count, resetAt: b.resetAt };
}
