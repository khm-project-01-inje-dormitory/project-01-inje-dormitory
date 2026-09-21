import { NextResponse } from "next/server";
import { store, deletePhotoFileIfLocal } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

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
