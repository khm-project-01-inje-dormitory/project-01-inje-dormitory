import { NextResponse } from "next/server";
import { store, uploadPhotoFile } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

/** 공개: 갤러리 목록 */
export async function GET() {
  return NextResponse.json({ photos: await store.listPhotos() });
}

/** 관리자: 사진 업로드 (multipart/form-data, files 복수 허용) */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  try {
    const form = await req.formData();
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const caption = String(form.get("caption") ?? "").slice(0, 100);
    const existing = await store.listPhotos();
    let sortOrder = existing.length ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0;

    const added = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > 10 * 1024 * 1024) continue; // 10MB 제한
      const url = await uploadPhotoFile(f);
      added.push(
        await store.addPhoto({
          id: crypto.randomUUID(),
          url,
          caption,
          sort_order: sortOrder++,
          created_at: new Date().toISOString(),
        })
      );
    }
    if (!added.length)
      return NextResponse.json({ error: "업로드 가능한 이미지가 없습니다. (10MB 이하, 이미지 파일)" }, { status: 400 });
    return NextResponse.json({ photos: added }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "업로드 실패 — Supabase Storage 버킷을 확인하세요." }, { status: 500 });
  }
}
