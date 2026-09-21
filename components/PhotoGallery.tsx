import Image from "next/image";
import type { Photo } from "@/types";

/** 펜션 사진 갤러리 — 관리자가 업로드한 사진(시드 포함)을 그리드로 노출 */
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  if (!photos.length) {
    return (
      <div className="card-surface p-10 text-center text-muted-foreground">
        아직 등록된 사진이 없습니다. 관리자 페이지에서 사진을 업로드해 주세요.
      </div>
    );
  }
  const [first, ...rest] = photos;
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 auto-rows-[140px] sm:auto-rows-[180px]">
      <div className="col-span-2 row-span-2 relative rounded-card overflow-hidden border border-border">
        <Image
          src={first.url}
          alt={first.caption || "펜션 사진"}
          fill
          unoptimized
          loading="eager"
          className="object-cover hover:scale-[1.02] transition-transform duration-500"
        />
      </div>
      {rest.slice(0, 7).map((p, i) => (
        <div
          key={p.id}
          className={`relative rounded-card overflow-hidden border border-border ${
            rest.length < 4 && i === 0 ? "col-span-2 row-span-2" : ""
          }`}
        >
          <Image
            src={p.url}
            alt={p.caption || "펜션 사진"}
            fill
            unoptimized
            loading="eager"
            className="object-cover hover:scale-[1.03] transition-transform duration-500"
          />
        </div>
      ))}
      {photos.length > 8 && (
        <div className="col-span-2 md:col-span-1 rounded-card bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg">
          +{photos.length - 8}장
        </div>
      )}
    </div>
  );
}
