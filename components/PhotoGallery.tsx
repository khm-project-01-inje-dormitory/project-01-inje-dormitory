"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { Photo } from "@/types";

const GRID_LIMIT = 8; // 그리드 노출 장수 — 나머지는 "+N장" 타일 → 라이트박스에서 전체 감상

/** 펜션 사진 갤러리 — 그리드 노출 + 탭 시 화면폭(모바일)/적절한 크기(PC) 라이트박스 팝업 */
export default function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // 라이트박스 표시 트랜지션(fade + 확대) — 열린 직후 한 프레임 뒤 활성화
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (openIndex === null) {
      setShown(false);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(raf);
  }, [openIndex]);

  // 배경 스크롤 잠금 — 팝업 중 모바일 배경이 함께 스크롤되는 것 방지
  useEffect(() => {
    if (openIndex === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [openIndex === null]); // eslint-disable-line react-hooks/exhaustive-deps

  const close = useCallback(() => setOpenIndex(null), []);
  const step = useCallback(
    (dir: 1 | -1) => setOpenIndex((i) => (i === null ? i : (i + dir + photos.length) % photos.length)),
    [photos.length]
  );

  // 키보드: ESC 닫기 · ←/→ 탐색
  useEffect(() => {
    if (openIndex === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openIndex === null, close, step]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!photos.length) {
    return (
      <div className="card-surface p-10 text-center text-muted-foreground">
        아직 등록된 사진이 없습니다. 관리자 페이지에서 사진을 업로드해 주세요.
      </div>
    );
  }

  const [first, ...rest] = photos;
  const extraCount = photos.length - GRID_LIMIT;

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3 auto-rows-[140px] sm:auto-rows-[180px]">
        <GalleryCell photo={first} big onOpen={() => setOpenIndex(0)} priority />
        {rest.slice(0, GRID_LIMIT - 1).map((p, i) => (
          <GalleryCell
            key={p.id}
            photo={p}
            big={rest.length < 4 && i === 0}
            onOpen={() => setOpenIndex(i + 1)}
          />
        ))}
        {extraCount > 0 && (
          <button
            type="button"
            onClick={() => setOpenIndex(GRID_LIMIT)}
            aria-label={`나머지 사진 ${extraCount}장 더 보기`}
            className="rounded-card bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg hover:brightness-95 active:scale-[0.98] transition"
          >
            +{extraCount}장
          </button>
        )}
      </div>

      {/* ── 라이트박스: 모바일 화면폭 가득 / PC 중앙 적절한 크기 ── */}
      {openIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="사진 크게 보기"
          className={`fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 transition-opacity duration-300 ${
            shown ? "opacity-100" : "opacity-0"
          }`}
          onClick={close}
        >
          <div
            className={`relative w-full max-w-4xl flex items-center justify-center transition-transform duration-300 ${
              shown ? "scale-100" : "scale-95"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photos[openIndex].url}
              alt={photos[openIndex].caption || "펜션 사진"}
              className="w-full max-h-[78vh] sm:max-h-[85vh] w-auto object-contain rounded-xl border border-white/10 shadow-2xl"
            />

            {/* 캡션 + 카운터 */}
            {(photos[openIndex].caption || photos.length > 1) && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 max-w-[90%]">
                {photos[openIndex].caption && (
                  <span className="text-xs sm:text-sm font-bold text-white bg-black/50 backdrop-blur rounded-lg px-3 py-1.5 truncate">
                    {photos[openIndex].caption}
                  </span>
                )}
                {photos.length > 1 && (
                  <span className="text-xs font-bold text-white/90 bg-black/50 backdrop-blur rounded-lg px-2.5 py-1.5 tabular-nums shrink-0">
                    {openIndex + 1}/{photos.length}
                  </span>
                )}
              </div>
            )}

            {/* 닫기 */}
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="absolute -top-2 -right-1 sm:-top-3 sm:-right-3 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* 좌우 탐색 — 사진이 2장 이상일 때만 */}
            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="이전 사진"
                  className="absolute left-1 sm:-left-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="다음 사진"
                  className="absolute right-1 sm:-right-14 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 border border-white/20 text-white backdrop-blur flex items-center justify-center hover:bg-white/20 active:scale-95 transition"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

/** 그리드 셀 — 탭하면 라이트박스로 해당 사진 열기 (hover 확대 유지) */
function GalleryCell({
  photo,
  big,
  onOpen,
  priority,
}: {
  photo: Photo;
  big: boolean;
  onOpen: () => void;
  priority?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={photo.caption ? `${photo.caption} 사진 크게 보기` : "사진 크게 보기"}
      className={`relative rounded-card overflow-hidden border border-border cursor-zoom-in group focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
        big ? "col-span-2 row-span-2" : ""
      }`}
    >
      <Image
        src={photo.url}
        alt={photo.caption || "펜션 사진"}
        fill
        unoptimized
        loading={priority ? "eager" : "lazy"}
        className="object-cover group-hover:scale-[1.03] transition-transform duration-500"
      />
      {photo.caption && (
        <span
          className={`absolute font-bold text-white bg-black/50 backdrop-blur rounded-lg ${
            big ? "bottom-2 left-2 text-xs px-2.5 py-1.5" : "bottom-1.5 left-1.5 right-1.5 text-[10px] sm:text-xs px-2 py-1 truncate"
          }`}
        >
          {photo.caption}
        </span>
      )}
    </button>
  );
}
