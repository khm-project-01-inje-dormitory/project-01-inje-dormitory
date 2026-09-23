import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { notifyAdmins } from "@/lib/push";
import { maskPhone } from "@/lib/format";
import { checkRate } from "@/lib/rate-limit";

const normPhone = (s: string) => s.replace(/[^0-9]/g, "");

/** 공개: 고객 예약 취소 (id 또는 예약코드 + 연락처 대조) → 관리자 푸시 발송 */
export async function POST(req: Request) {
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const gate = checkRate(`cancel:${ip}`, 10, 600_000); // 10분에 10회
  if (!gate.ok)
    return NextResponse.json({ error: "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const phone = normPhone(String(body.phone ?? ""));
  const id = String(body.id ?? "");
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!phone || (!id && !code))
    return NextResponse.json({ error: "정보가 부족합니다." }, { status: 400 });

  const all = await store.listReservations();
  const found = all.find(
    (r) =>
      normPhone(r.phone).endsWith(phone.slice(-8)) &&
      (id ? r.id === id : r.code.toUpperCase() === code)
  );
  if (!found) return NextResponse.json({ error: "일치하는 예약이 없습니다." }, { status: 404 });
  if (found.status === "cancelled")
    return NextResponse.json({ reservation: { ...found, phone: maskPhone(found.phone) } });
  if (found.status === "completed")
    return NextResponse.json({ error: "이미 투숙 완료된 예약입니다." }, { status: 400 });

  const updated = await store.updateReservation(found.id, { status: "cancelled" });
  await notifyAdmins(
    `⚠️ 예약 취소 — ${found.guest_name}님`,
    `${found.check_in} ${found.nights}박 · ${found.guests}명 (${found.code})`,
    "/admin"
  );
  // M-3: 응답에서 전화번호 마스킹
  return NextResponse.json({ reservation: updated ? { ...updated, phone: maskPhone(updated.phone) } : updated });
}
