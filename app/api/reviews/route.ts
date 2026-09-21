import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { maskName } from "@/lib/format";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";

const normPhone = (s: string) => s.replace(/[^0-9]/g, "");

/** 공개: 노출 중인 후기 + 평균 별점 (?all=1 → 관리자 전체) */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = await store.listReviews();
  if (searchParams.get("all") === "1") {
    if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
    return NextResponse.json({ reviews: all });
  }
  const visible = all.filter((r) => r.visible);
  const avg = visible.length
    ? Math.round((visible.reduce((s, r) => s + r.rating, 0) / visible.length) * 10) / 10
    : 0;
  return NextResponse.json({
    reviews: visible.slice(0, 8).map((r) => ({ ...r, guest_name: maskName(r.guest_name) })),
    avg,
    count: visible.length,
  });
}

/** 공개: 후기 등록 — 투숙완료 예약(코드+연락처 대조)에 한함, 1예약 1후기 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const phone = normPhone(String(body.phone ?? ""));
  const rating = Math.floor(Number(body.rating));
  const comment = String(body.comment ?? "").trim().slice(0, 300);

  if (!code || !phone) return NextResponse.json({ error: "예약 정보가 부족합니다." }, { status: 400 });
  if (!rating || rating < 1 || rating > 5)
    return NextResponse.json({ error: "별점을 선택해 주세요." }, { status: 400 });
  if (!comment) return NextResponse.json({ error: "후기 내용을 입력해 주세요." }, { status: 400 });

  const found = (await store.listReservations()).find(
    (r) => r.code.toUpperCase() === code && normPhone(r.phone).endsWith(phone.slice(-8))
  );
  if (!found) return NextResponse.json({ error: "일치하는 예약이 없습니다." }, { status: 404 });
  if (found.status !== "completed")
    return NextResponse.json({ error: "투숙이 완료된 예약에만 후기를 남길 수 있습니다." }, { status: 400 });

  const existing = (await store.listReviews()).find((r) => r.reservation_code === code);
  if (existing)
    return NextResponse.json({ error: "이 예약에는 이미 후기를 남기셨습니다. 감사합니다!" }, { status: 409 });

  const saved = await store.addReview({
    id: crypto.randomUUID(),
    reservation_code: code,
    guest_name: found.guest_name,
    rating,
    comment,
    visible: true,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ review: { ...saved, guest_name: maskName(saved.guest_name) } }, { status: 201 });
}
