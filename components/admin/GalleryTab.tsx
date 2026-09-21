"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { Photo } from "@/types";

/** 갤러리 관리 — 다중 업로드(브라우저에서 WebP 리사이즈 후 저장) */
export default function GalleryTab() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/photos");
    const data = await res.json();
    setPhotos(data.photos ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true); setError("");
    try {
      const form = new FormData();
      for (const f of Array.from(files)) form.append("files", await shrinkImage(f));
      const res = await fetch("/api/photos", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(id: string) {
    if (!confirm("이 사진을 삭제하시겠습니까?")) return;
    await fetch(`/api/photos/${id}`, { method: "DELETE" });
    await load();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-black">펜션 사진 갤러리 <span className="text-muted-foreground font-medium text-sm">({photos.length}장)</span></h2>
        <label className="btn-primary cursor-pointer">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
          {uploading ? "업로드 중…" : "사진 올리기"}
          <input
            ref={fileRef} type="file" accept="image/*" multiple className="hidden"
            onChange={(e) => upload(e.target.files)} disabled={uploading}
          />
        </label>
      </div>
      {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      <p className="text-xs text-muted-foreground -mt-2">
        여러 장을 한 번에 선택할 수 있어요. 사진은 업로드 전 <b>웹용으로 자동 축소(WebP)</b>되어 저장 공간과 로딩 속도를 지킵니다.
      </p>

      {loading ? (
        <div className="card-surface p-10 flex items-center justify-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
      ) : photos.length === 0 ? (
        <div className="card-surface p-10 text-center text-muted-foreground">아직 사진이 없습니다. 첫 사진을 올려보세요!</div>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
          {photos.map((p) => (
            <div key={p.id} className="group relative aspect-square rounded-xl overflow-hidden border border-border">
              <img src={p.url} alt={p.caption || "펜션 사진"} className="w-full h-full object-cover" />
              <button
                onClick={() => remove(p.id)}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-black/50 text-white items-center justify-center hidden group-hover:flex hover:bg-danger"
                title="삭제"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * 브라우저에서 이미지 축소: 최대 변 1600px, WebP 품질 0.85.
 * Supabase Storage 무료 용량(1GB)과 랜딩 로딩 속도를 보호합니다.
 */
async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1600;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
    bitmap.close?.();
    if (!blob || blob.size >= file.size * 1.2) return file; // 축소 이득이 없으면 원본
    return new File([blob], `${file.name.replace(/\.\w+$/, "")}.webp`, { type: "image/webp" });
  } catch {
    return file; // 디코딩 실패 시 원본 그대로 (서버에서 거절될 수 있음)
  }
}
