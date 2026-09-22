import { NextResponse } from "next/server";
import { store, deletePhotoFileIfLocal } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

/** 관리자: 대문 표시 사진 선택 — hero 종류 사진 전체에서 active를 이 사진 하나로 */
export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const body = await req.json().catch(() => ({}));

  const photos = await store.listPhotos();
  const target = photos.find((p) => p.id === params.id);
  if (!target) return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });

  if (typeof body.caption === "string") {
    await store.updatePhoto(params.id, { caption: body.caption.trim().slice(0, 60) });
  }
  if (body.active === true) {
    if (target.kind !== "hero")
      return NextResponse.json({ error: "대문 표시는 대문 사진에서만 선택할 수 있습니다." }, { status: 400 });
    // 기존 active 정리 후 이 사진만 활성
    for (const p of photos.filter((x) => x.kind === "hero" && x.active)) {
      await store.updatePhoto(p.id, { active: false });
    }
  }
  const updated = await store.updatePhoto(params.id, {
    ...(typeof body.caption === "string" ? { caption: body.caption.trim().slice(0, 60) } : {}),
    ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
  });
  return NextResponse.json({ photo: updated });
}

/** 관리자: 사진 삭제 */
export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const photos = await store.listPhotos();
  const target = photos.find((p) => p.id === params.id);
  if (!target) return NextResponse.json({ error: "사진을 찾을 수 없습니다." }, { status: 404 });

  await deletePhotoFileIfLocal(target.url);
  await store.deletePhoto(params.id);
  return NextResponse.json({ ok: true });
}
