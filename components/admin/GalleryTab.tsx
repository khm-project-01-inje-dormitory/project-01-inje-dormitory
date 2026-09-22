"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Pencil, Star, Trash2 } from "lucide-react";
import type { Photo } from "@/types";

/** 대문/소개 사진 정책 — 서버(app/api/photos)와 동일한 값 유지 */
const POLICY = {
  hero: { max: 8, label: "대문", desc: "최대 변 2560px · 고품질(압축 적음) · 파일당 5MB — 8장을 올려두고 언제든 대문 1장을 골라 바꿀 수 있어요 (예: 봄/여름/가을/겨울)" },
  gallery: { max: 30, label: "소개", desc: "최대 변 1600px · 웹 최적화 압축 · 파일당 2.5MB" },
} as const;

/** 갤러리 관리 — 대문(4장, 표시 1장 선택)/소개 두 섹터 (총 20장, 서버 강제) */
export default function GalleryTab() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<null | "hero" | "gallery">(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const heroRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/photos");
    const data = await res.json();
    setPhotos(data.photos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const heroPhotos = photos.filter((p) => p.kind === "hero");
  const galleryPhotos = photos.filter((p) => p.kind !== "hero"); // 기존 데이터(kind 없음)는 소개 취급

  async function upload(files: FileList | null, kind: "hero" | "gallery") {
    if (!files?.length) return;
    setUploading(kind); setError("");
    try {
      const form = new FormData();
      form.append("kind", kind);
      // 대문은 고품질 유지(2560px·0.92), 소개는 웹 최적화(1600px·0.85)
      for (const f of Array.from(files))
        form.append("files", kind === "hero" ? await shrinkImage(f, 2560, 0.92) : await shrinkImage(f, 1600, 0.85));
      const res = await fetch("/api/photos", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(null);
      if (kind === "hero" && heroRef.current) heroRef.current.value = "";
      if (kind === "gallery" && galleryRef.current) galleryRef.current.value = "";
    }
  }

  /** 캡션 저장 (예: "1층 1번방") */
  async function saveCaption(id: string, caption: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "캡션 저장 실패");
    } finally {
      setBusyId(null);
    }
  }

  /** 대문 표시 1장 선택 — 서버가 hero 전체에서 중복 active를 정리 */
  async function setActive(id: string) {
    setBusyId(id); setError("");
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "대문 변경 실패");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-5">
      <h2 className="font-black">펜션 사진 관리 <span className="text-muted-foreground font-medium text-sm">(총 {photos.length}/38장 · 대문 {heroPhotos.length}/8 · 소개 {galleryPhotos.length}/30)</span></h2>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}

      {/* ── 대문 사진 ── */}
      <div className="card-surface p-5 space-y-3 border-2 border-primary/30">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black flex items-center gap-2">🏠 대문 사진 <span className="text-xs font-bold text-primary bg-primary-soft rounded-full px-2.5 py-1">{heroPhotos.length}/{POLICY.hero.max}</span></h3>
            <p className="text-xs text-muted-foreground mt-1">{POLICY.hero.desc}</p>
          </div>
          <label className="btn-primary cursor-pointer shrink-0">
            {uploading === "hero" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading === "hero" ? "업로드 중…" : "대문 사진 올리기"}
            <input ref={heroRef} type="file" accept="image/*" multiple className="hidden" disabled={uploading !== null} onChange={(e) => upload(e.target.files, "hero")} />
          </label>
        </div>
        {heroPhotos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center bg-muted/40 rounded-xl">대문 사진이 없으면 소개 사진 중 첫 번째가 대문에 표시됩니다.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            {heroPhotos.map((p) => (
              <div key={p.id} className={`group relative aspect-video rounded-xl overflow-hidden border-2 ${p.active ? "border-primary" : "border-border"}`}>
                <img src={p.url} alt={p.caption || "대문 사진"} className="w-full h-full object-cover" />
                {p.active && (
                  <span className="absolute top-1.5 left-1.5 text-[10px] font-bold text-white bg-primary rounded px-1.5 py-0.5 flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-current" /> 대문 표시중</span>
                )}
                <div className="absolute bottom-0 inset-x-0 p-1.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-t from-black/60 to-transparent">
                  {!p.active && (
                    <button onClick={() => setActive(p.id)} disabled={busyId === p.id}
                      className="flex-1 text-[11px] font-bold text-white bg-primary/90 hover:bg-primary rounded-lg py-1.5 flex items-center justify-center gap-1">
                      {busyId === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Star className="w-3 h-3" />} 이 사진을 대문으로
                    </button>
                  )}
                  <button onClick={() => remove(p.id)} title="삭제"
                    className="w-8 text-white bg-black/50 hover:bg-danger rounded-lg flex items-center justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── 소개 사진 ── */}
      <div className="card-surface p-5 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black flex items-center gap-2">🖼️ 소개 사진 <span className="text-xs font-bold text-muted-foreground bg-muted rounded-full px-2.5 py-1">{galleryPhotos.length}/{POLICY.gallery.max}</span></h3>
            <p className="text-xs text-muted-foreground mt-1">{POLICY.gallery.desc} — 여러 장을 한 번에 선택할 수 있어요.</p>
          </div>
          <label className="btn-soft cursor-pointer shrink-0">
            {uploading === "gallery" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading === "gallery" ? "업로드 중…" : "소개 사진 올리기"}
            <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden" disabled={uploading !== null} onChange={(e) => upload(e.target.files, "gallery")} />
          </label>
        </div>
        {galleryPhotos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center bg-muted/40 rounded-xl">아직 소개 사진이 없습니다. 첫 사진을 올려보세요!</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3">
            {galleryPhotos.map((p) => (
              <CaptionCard key={p.id} photo={p} busy={busyId === p.id} onSave={(c) => saveCaption(p.id, c)} onRemove={() => remove(p.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 브라우저에서 이미지 축소 (maxPx·품질은 호출부에서 지정).
 * Supabase Storage 무료 용량(1GB)과 랜딩 로딩 속도를 보호합니다.
 */
async function shrinkImage(file: File, maxPx: number, quality: number): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxPx / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    bitmap.close?.();
    if (!blob || blob.size >= file.size * 1.2) return file; // 축소 이득이 없으면 원본
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file; // 디코딩 실패 시 원본 그대로 (서버 한도에서 거절될 수 있음)
  }
}


/** 소개 사진 카드 — 캡션(방 이름 등) 배지 표시 + 관리자 인라인 수정 */
function CaptionCard({ photo, busy, onSave, onRemove }: {
  photo: Photo;
  busy: boolean;
  onSave: (caption: string) => void;
  onRemove: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(photo.caption);

  return (
    <div className="group relative rounded-xl overflow-hidden border border-border bg-card">
      <div className="relative aspect-square">
        <img src={photo.url} alt={photo.caption || "펜션 사진"} className="w-full h-full object-cover" />
        {photo.caption && !editing && (
          <span className="absolute bottom-2 left-2 right-2 text-[11px] font-bold text-white bg-black/55 backdrop-blur rounded-lg px-2 py-1.5 truncate">
            {photo.caption}
          </span>
        )}
        <div className="absolute top-1.5 right-1.5 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => setEditing(true)} title="설명 편집"
            className="w-7 h-7 rounded-lg bg-black/50 text-white hover:bg-primary flex items-center justify-center">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={onRemove} title="삭제"
            className="w-7 h-7 rounded-lg bg-black/50 text-white hover:bg-danger flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {editing ? (
        <div className="p-2 space-y-1.5">
          <input
            autoFocus value={text} maxLength={60}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { onSave(text); setEditing(false); } if (e.key === "Escape") { setText(photo.caption); setEditing(false); } }}
            placeholder="예: 1층 1번방"
            className="input !py-1.5 !text-xs"
          />
          <div className="flex gap-1.5">
            <button onClick={() => { onSave(text); setEditing(false); }} disabled={busy}
              className="btn-primary flex-1 !py-1.5 !text-xs">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : "저장"}
            </button>
            <button onClick={() => { setText(photo.caption); setEditing(false); }}
              className="btn-soft flex-1 !py-1.5 !text-xs">취소</button>
          </div>
        </div>
      ) : (
        <div className="px-2 py-1.5">
          {photo.caption
            ? <p className="text-[11px] font-bold truncate">{photo.caption}</p>
            : <p className="text-[11px] text-muted-foreground/60 italic">설명 추가… (클릭 편집)</p>}
        </div>
      )}
    </div>
  );
}