// ─────────────────────────────────────────────────────────────
//  날짜/통화 유틸 — 서버(UTC)와 무관하게 항상 한국(KST) 기준으로 계산
// ─────────────────────────────────────────────────────────────

const KST_OFFSET = 9 * 60 * 60 * 1000;

/** 현재 KST 날짜를 YYYY-MM-DD 로 */
export function todayKST(): string {
  return new Date(Date.now() + KST_OFFSET).toISOString().slice(0, 10);
}

/** Date → YYYY-MM-DD (KST 보정) */
export function toYMD(d: Date): string {
  return new Date(d.getTime() + KST_OFFSET).toISOString().slice(0, 10);
}

/** YYYY-MM-DD → Date (UTC 자정 기준 파싱, 날짜 연산용) */
export function parseYMD(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function addDays(s: string, days: number): string {
  const d = parseYMD(s);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 체크인~체크아웃 사이 '박' 수 */
export function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((parseYMD(checkOut).getTime() - parseYMD(checkIn).getTime()) / 86400000);
}

/** 두 날짜 사이의 모든 박(checkIn 날짜) 목록 */
export function eachNight(checkIn: string, checkOut: string): string[] {
  const out: string[] = [];
  let cur = checkIn;
  while (cur < checkOut) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

export function fmtDate(s: string): string {
  const [y, m, d] = s.split("-");
  return `${y}.${m}.${d}`;
}

/** 2026-09-21(월) 형태 */
export function fmtDateKorean(s: string): string {
  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  const d = parseYMD(s);
  return `${fmtDate(s)}(${dows[d.getUTCDay()]})`;
}

export function fmtWon(n: number): string {
  return n.toLocaleString("ko-KR") + "원";
}

/** ISO timestamp → MM.DD HH:mm (KST) */
export function fmtDateTime(iso: string): string {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET);
  const MM = String(d.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(d.getUTCDate()).padStart(2, "0");
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${MM}.${DD} ${hh}:${mm}`;
}

export function makeCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 4; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return `PB-${s}`;
}

/** 후기 등 이름 마스킹: 김도윤 → 김** */
export function maskName(name: string): string {
  if (!name) return "";
  return name[0] + "*".repeat(Math.max(1, name.length - 1));
}
