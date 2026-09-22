// ─────────────────────────────────────────────────────────────
//  통합 데이터 접근 계층 — 페이지/API는 이 인터페이스만 사용
//  데모(로컬 JSON) ↔ Supabase 운영 전환은 환경변수만으로 자동 처리
// ─────────────────────────────────────────────────────────────
import "server-only";
import { isDemoMode } from "./mode";
import { demoStore } from "./demo-store";
import { supabaseStore } from "./supabase-store";
import { eachNight } from "./format";
import type { BlockedDate, DayAvailability, Photo, Reservation, Review, Settings } from "@/types";

export const store = isDemoMode ? demoStore : supabaseStore;

/** 기간 내 예약들로 날짜별 투숙 인원 집계 (박 단위) — 휴무일은 잔여 0 처리 */
export function computeAvailability(
  reservations: Reservation[],
  from: string,
  to: string,
  maxGuests: number,
  blockedDates: string[] = []
): DayAvailability[] {
  const active = reservations.filter((r) => r.status === "pending" || r.status === "confirmed");
  const blocked = new Set(blockedDates);
  const nights = eachNight(from, to);
  return nights.map((date) => {
    const isBlocked = blocked.has(date);
    const booked = active
      .filter((r) => date >= r.check_in && date < r.check_out)
      .reduce((sum, r) => sum + r.guests, 0);
    return {
      date,
      booked,
      remaining: isBlocked ? 0 : Math.max(0, maxGuests - booked),
      blocked: isBlocked,
    };
  });
}

/** 사진 업로드: 데모는 로컬 public/uploads, 운영은 Supabase Storage */
export async function uploadPhotoFile(file: File): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-가-힣]/g, "_");
  if (isDemoMode) {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.join(process.cwd(), "public", "uploads");
    await fs.mkdir(dir, { recursive: true });
    const filename = `${Date.now()}-${safeName}`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
    return `/uploads/${filename}`;
  }
  const { uploadToSupabaseStorage } = await import("./supabase-store");
  return uploadToSupabaseStorage(Buffer.from(await file.arrayBuffer()), safeName, file.type || "image/jpeg");
}

/** 숨김된 예약 목록 (복구 화면용) */
export async function listDeletedReservations(): Promise<Reservation[]> {
  const s = store as unknown as { listDeletedReservations?: () => Promise<Reservation[]> };
  if (s.listDeletedReservations) return s.listDeletedReservations();
  return []; // 데모 모드 미지원 시 빈 목록
}

/** 소프트 삭제/복구/감사로그 — 운영 이력 보존용 (제안 A+B) */
export async function softDeleteReservation(id: string, label: string, before: unknown): Promise<void> {
  await store.updateReservation(id, { deleted_at: new Date().toISOString() } as never);
  await store.addAuditLog({ action: "hide", target_id: id, target_label: label, before, after: { deleted_at: new Date().toISOString() } });
}
export async function restoreReservation(id: string, label: string): Promise<void> {
  await store.updateReservation(id, { deleted_at: null } as never);
  await store.addAuditLog({ action: "restore", target_id: id, target_label: label, after: { deleted_at: null } });
}
export async function purgeReservation(id: string, label: string, before: unknown): Promise<void> {
  await store.addAuditLog({ action: "purge", target_id: id, target_label: label, before, after: { purged: true } });
  const del = store as unknown as { deleteReservation?: (id: string) => Promise<boolean> };
  if (del.deleteReservation) await del.deleteReservation(id);
}

export async function deletePhotoFileIfLocal(url: string): Promise<void> {
  if (!url.startsWith("/uploads/") || url.includes("seed-")) return; // 시드는 유지
  const fs = await import("node:fs/promises");
  const path = await import("node:path");
  try {
    await fs.unlink(path.join(process.cwd(), "public", url));
  } catch {
    /* 이미 없음 */
  }
}

export type { BlockedDate, Photo, Reservation, Review, Settings };
