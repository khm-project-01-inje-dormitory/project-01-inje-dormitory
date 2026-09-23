import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { maskPhone } from "@/lib/format";
import { checkRate } from "@/lib/rate-limit";

const normPhone = (s: string) => s.replace(/[^0-9]/g, "");
const normName = (s: string) => s.trim().replace(/\s+/g, "");
const normCode = (s: string) => s.trim().toUpperCase();

/**
 * 공개: 예약 조회
 *  - 기본: 이름 + 연락처 (예약코드를 몰라도 본인 예약 전체 조회)
 *  - 보조: 예약코드 + 연락처
 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const gate = checkRate(`lookup:${ip}`, 20, 600_000); // 10분에 20회
  if (!gate.ok)
    return NextResponse.json({ error: "조회 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const phone = normPhone(String(body.phone ?? ""));
  const name = normName(String(body.name ?? ""));
  const code = normCode(String(body.code ?? ""));
  if (!phone) return NextResponse.json({ error: "연락처를 입력해 주세요." }, { status: 400 });
  if (!name && !code)
    return NextResponse.json({ error: "이름 또는 예약코드를 입력해 주세요." }, { status: 400 });

  const all = await store.listReservations();
  const found = all.filter(
    (r) =>
      normPhone(r.phone).endsWith(phone.slice(-8)) &&
      (code ? r.code.toUpperCase() === code : r.guest_name === name)
  );
  if (!found.length)
    return NextResponse.json({ error: "일치하는 예약이 없습니다." }, { status: 404 });
  // M-3: 응답에서 전화번호 마스킹 — 조회자에게 필요한 정보는 뒤 4자리 확인용 정도
  return NextResponse.json({ reservations: found.map((r) => ({ ...r, phone: maskPhone(r.phone) })) });
}
