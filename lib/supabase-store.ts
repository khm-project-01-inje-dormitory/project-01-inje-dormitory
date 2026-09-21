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
  contact_phone: "",
  check_in_time: "15:00",
  check_out_time: "11:00",
  auto_close_overbook: false,
  address: "",
  map_link: "",
  parking_info: "",
  arrival_info: "",
};

export const supabaseStore = {
  async getSettings(): Promise<Settings> {
    const { data } = await db().from("settings").select("*").eq("id", 1).maybeSingle();
    if (data) return data as Settings;
    await db().from("settings").upsert(SETTINGS_SEED);
    return SETTINGS_SEED as Settings;
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
      .order("check_in", { ascending: true });
    if (error) throw error;
    return (data ?? []) as Reservation[];
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
