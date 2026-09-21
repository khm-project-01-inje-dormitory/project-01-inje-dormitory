import { NextResponse } from "next/server";
import { store } from "@/lib/store";

const normPhone = (s: string) => s.replace(/[^0-9]/g, "");
const normCode = (s: string) => s.trim().toUpperCase();

/**
 * 공개: 예약 조회
 *  - 기본: 이름 + 연락처 (예약코드를 몰라도 본인 예약 전체 조회)
 *  - 보조: 예약코드 + 연락처
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const phone = normPhone(String(body.phone ?? ""));
  const name = String(body.name ?? "").trim();
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
  return NextResponse.json({ reservations: found });
}
