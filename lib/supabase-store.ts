// ─────────────────────────────────────────────────────────────
//  Supabase 운영 모드 저장소 (서버 전용 — service role 사용)
//  테이블/버킷 구성은 supabase/schema.sql 참조
// ─────────────────────────────────────────────────────────────
import "server-only";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_SERVICE, SUPABASE_URL } from "./mode";
import type {
  BlockedDate, Photo, PushSubscriptionRow, Reservation, Review, Settings,
} from "@/types";

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) client = createClient(SUPABASE_URL, SUPABASE_SERVICE);
  return client;
}

/**
 * 시계 드리프트 방어: 서버 시계가 미래로 살짝 밀리면 Supabase가
 * PGRST303 "JWT issued at future" 로 요청을 거부한다 (간헐적 500/401의 원인).
 * 짧은 대기 후 재시도하면 시계가 재동기화되며 대부분 회복된다.
 */
const CLOCK_ERR = ["PGRST303", "JWT issued at future"];
export async function withClockRetry<T>(op: () => Promise<{ error: { code?: string; message: string } | null }>): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < 3; i++) {
    const { error, ...rest } = await op() as { error: { code?: string; message: string } | null } & Record<string, unknown>;
    if (!error) return rest as T;
    const hit = CLOCK_ERR.some((k) => error.code === k || (error.message || "").includes(k));
    lastErr = error;
    if (!hit) throw new Error(`DB 오류: ${error.message}`);
    await new Promise((r) => setTimeout(r, 400 * (i + 1)));
  }
  throw new Error(`DB 오류(시계 동기화 대기 후에도 실패): ${String(lastErr)}`);
}

const SETTINGS_SEED: Partial<Settings> = {
  id: 1,
  pension_name: "우리 펜션",
  tagline: "집 전체를 통째로 빌려드립니다",
  description: "",
  per_person_price: 30000,
  max_guests: 12,
  bank_name: "",
  account_number: "",
  account_holder: "",
  contact_phone: "010-1234-5678",
  check_in_time: "15:00",
  check_out_time: "11:00",
  auto_close_overbook: false,
  address: "강원도 인제군 인제읍 내린천로 6534-39 데모펜션",
  map_link: "",
  parking_info: "",
  arrival_info: "",
  booking_paused: false,
  admin_password_hash: "",
  hero_badge_visible: true,
  booking_pause_message: "지금은 준비 중입니다 — 잠시 예약을 쉬어가는 시간을 갖고 있습니다. 곧 다시 찾아뵙겠습니다.",
  booking_resume_date: "",
  hero_badge_text: "집 전체 대여 · 방 선택 없이 자유롭게",
  tagline_visible: false,
  feature1_title: "집 전체 통대여",
  feature1_body: "",
  feature2_title: "",
  feature2_body: "인원 단위 예약으로 가족·친구 모임에 딱 맞습니다.",
  feature3_title: "간편 입금 결제",
  feature3_body: "토스로 바로 송금하세요. 카드 결제 없음.",
  feature1_visible: true,
  feature2_visible: true,
  feature3_visible: true,
};

export const supabaseStore = {
  async getSettings(): Promise<Settings> {
    // ⚠ error를 절대 무시하지 않는다 — 무시하면 조회 실패가 "행 없음"으로 위장해
    // 아래 시드 upsert가 기존 설정(요금·인원·계좌)을 기본값으로 덮어쓰는 사고가 난다.
    const { data, error } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
    if (error) throw new Error(`설정 조회 실패: ${error.message}`);
    if (data) return data as Settings;
    // 행이 정말 없을 때만 최초 1회 시드 (기존 값 덮어쓰기 없음)
    const { error: seedErr } = await db().from("settings").upsert(SETTINGS_SEED, { onConflict: "id", ignoreDuplicates: true });
    if (seedErr) throw new Error(`설정 초기화 실패: ${seedErr.message}`);
    const { data: seeded } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
    return (seeded ?? SETTINGS_SEED) as Settings;
  },
  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    const { data, error } = await db()
      .from("settings")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select()
      .single();
    if (error) throw error;
    return data as Settings;
  },
  async listReservations(): Promise<Reservation[]> {
    const { data, error } = await db()
      .from("reservations")
      .select("*")
      .is("deleted_at", null)          // 소프트 삭제(숨김) 건은 목록·통계에서 제외
      .order("check_in", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },
  /** 숨김(소프트 삭제)된 예약 목록 — 복구 화면용 */
  async listDeletedReservations(): Promise<Reservation[]> {
    const { data, error } = await db()
      .from("reservations")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Reservation[];
  },
  async addAuditLog(log: { action: string; target_id: string; target_label?: string; before?: unknown; after?: unknown }): Promise<void> {
    await db().from("audit_logs").insert({
      actor: "admin",
      action: log.action,
      target_id: log.target_id,
      target_label: log.target_label ?? "",
      before: (log.before ?? {}) as object,
      after: (log.after ?? {}) as object,
    });
  },
  async listAuditLogs(limit = 50): Promise<unknown[]> {
    const { data, error } = await db()
      .from("audit_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data ?? [];
  },
  async createReservation(r: Reservation): Promise<Reservation> {
    const { data, error } = await db().from("reservations").insert(r).select().single();
    if (error) throw error;
    return data as Reservation;
  },
  async getReservation(id: string): Promise<Reservation | null> {
    const { data, error } = await db().from("reservations").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as Reservation) ?? null;
  },
  async updateReservation(id: string, patch: Partial<Reservation>): Promise<Reservation | null> {
    const { data, error } = await db()
      .from("reservations")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as Reservation) ?? null;
  },
  async listPhotos(): Promise<Photo[]> {
    const { data, error } = await db()
      .from("photos")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Photo[];
  },
  async addPhoto(p: Photo): Promise<Photo> {
    const { data, error } = await db().from("photos").insert(p).select().single();
    if (error) throw error;
    return data as Photo;
  },
  async updatePhoto(id: string, patch: Partial<Photo>): Promise<Photo | null> {
    const { data, error } = await db()
      .from("photos")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as Photo) ?? null;
  },
  async deletePhoto(id: string): Promise<boolean> {
    const { error } = await db().from("photos").delete().eq("id", id);
    return !error;
  },
  async listBlockedDates(): Promise<BlockedDate[]> {
    const { data } = await db()
      .from("blocked_dates")
      .select("*")
      .order("date", { ascending: true });
    return (data ?? []) as BlockedDate[];
  },
  async addBlockedDate(b: BlockedDate): Promise<BlockedDate> {
    const { data, error } = await db()
      .from("blocked_dates")
      .upsert(b, { onConflict: "date" })
      .select()
      .single();
    if (error) throw error;
    return data as BlockedDate;
  },
  async removeBlockedDate(date: string): Promise<boolean> {
    const { error } = await db().from("blocked_dates").delete().eq("date", date);
    return !error;
  },
  async listReviews(): Promise<Review[]> {
    const { data } = await db()
      .from("reviews")
      .select("*")
      .order("created_at", { ascending: false });
    return (data ?? []) as Review[];
  },
  async addReview(r: Review): Promise<Review> {
    const { data, error } = await db().from("reviews").insert(r).select().single();
    if (error) throw error;
    return data as Review;
  },
  async updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
    const { data, error } = await db()
      .from("reviews")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (error) throw error;
    return (data as Review) ?? null;
  },
  async deleteReview(id: string): Promise<boolean> {
    const { error } = await db().from("reviews").delete().eq("id", id);
    return !error;
  },
  async listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
    const { data } = await db().from("push_subscriptions").select("*");
    return (data ?? []) as PushSubscriptionRow[];
  },
  async savePushSubscription(s: PushSubscriptionRow): Promise<void> {
    await db().from("push_subscriptions").upsert(s, { onConflict: "endpoint" });
  },
  async deletePushSubscription(endpoint: string): Promise<void> {
    await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  },
};

/** Storage 'photos' 버킷 업로드 (API route에서 multipart 파일 수신 후 호출) */
export async function uploadToSupabaseStorage(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<string> {
  const pathInBucket = `${Date.now()}-${filename}`;
  const { error } = await db()
    .storage.from("photos")
    .upload(pathInBucket, file, { contentType, upsert: false });
  if (error) throw error;
  return db().storage.from("photos").getPublicUrl(pathInBucket).data.publicUrl;
}
