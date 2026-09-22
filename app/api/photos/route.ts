import { NextResponse } from "next/server";
import { store, uploadPhotoFile } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/**
 * 사진 정책 — Supabase Storage 무료(1GB) 기준 설계.
 * 대문(hero): 소수 정예, 고화질 유지 (최대 변 2560px · WebP 0.92 — 클라이언트 압축)
 * 소개(gallery): 다수, 웹 최적화 (최대 변 1600px · WebP 0.85)
 * 총 20장 한도는 서버에서 강제 (클라이언트 우회 무의미)
 */
const PHOTO_POLICY = {
  total: 38,
  hero: { max: 8, maxBytes: 5 * 1024 * 1024, label: "대문" },
  gallery: { max: 30, maxBytes: 2 * 1024 * 1024 + 512 * 1024, label: "소개" },
} as const;

/** 공개: 사진 목록 */
export async function GET() {
  return NextResponse.json({ photos: await store.listPhotos() });
}

/** 관리자: 사진 업로드 (multipart/form-data — files 복수, kind=hero|gallery) */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  try {
    const form = await req.formData();
    const kind = form.get("kind") === "hero" ? "hero" : "gallery";
    const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

    const policy = PHOTO_POLICY[kind];
    const existing = await store.listPhotos();
    const kindCount = existing.filter((p) => (p.kind ?? "gallery") === kind).length;
    const totalCount = existing.length;
    // 개별 캡션: captions[i] ↔ files[i] 같은 순서 (없으면 빈 값)
    const captions = form.getAll("captions").map((c) => String(c).trim().slice(0, 60));

    if (totalCount + files.length > PHOTO_POLICY.total)
      return NextResponse.json(
        { error: `사진은 총 ${PHOTO_POLICY.total}장까지입니다. (현재 ${totalCount}장) 먼저 삭제해 주세요.` },
        { status: 400 }
      );
    if (kindCount + files.length > policy.max)
      return NextResponse.json(
        { error: `${policy.label} 사진은 최대 ${policy.max}장까지입니다. (현재 ${kindCount}장)` },
        { status: 400 }
      );

    let sortOrder = existing.length ? Math.max(...existing.map((p) => p.sort_order)) + 1 : 0;
    const added = [];
    for (const [i, f] of files.entries()) {
      if (!f.type.startsWith("image/")) continue;
      if (f.size > policy.maxBytes) continue;
      const url = await uploadPhotoFile(f);
      // hero는 업로드된 것 중 "현재 대문" 1장을 관리자가 선택 (첫 hero 업로드 시 자동 선택)
      const existingHeroes = existing.filter((p) => p.kind === "hero");
      const makeActive = kind === "hero" && existingHeroes.length === 0;
      added.push(
        await store.addPhoto({
          id: crypto.randomUUID(),
          url,
          kind,
          active: makeActive,
          caption: captions[i] ?? "",
          sort_order: sortOrder++,
          created_at: new Date().toISOString(),
        })
      );
    }
    if (!added.length)
      return NextResponse.json(
        { error: `업로드 가능한 이미지가 없습니다. (${policy.label} 사진은 파일당 ${Math.round(policy.maxBytes / 1024 / 1024)}MB 이하)` },
        { status: 400 }
      );
    return NextResponse.json({ photos: added }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "업로드 실패 — Supabase Storage 버킷을 확인하세요." }, { status: 500 });
  }
}
