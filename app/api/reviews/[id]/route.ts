import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

/** 관리자: 후기 노출/숨김 전환 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (body.visible === undefined)
    return NextResponse.json({ error: "변경할 값이 없습니다." }, { status: 400 });
  const updated = await store.updateReview(params.id, { visible: Boolean(body.visible) });
  if (!updated) return NextResponse.json({ error: "후기를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ review: updated });
}

/** 관리자: 후기 삭제 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const ok = await store.deleteReview(params.id);
  if (!ok) return NextResponse.json({ error: "후기를 찾을 수 없습니다." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
