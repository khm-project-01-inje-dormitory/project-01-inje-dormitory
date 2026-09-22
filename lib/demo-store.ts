// ─────────────────────────────────────────────────────────────
//  데모 모드 저장소 — 로컬 JSON 파일(data/db.json) 기반
//  운영 전환 시 lib/store.ts 가 자동으로 Supabase 어댑터로 교체되므로
//  이 파일은 프로토타입 검증 전용이며 배포 코드에 영향을 주지 않습니다.
// ─────────────────────────────────────────────────────────────
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { addDays, todayKST } from "./format";
import type {
  BlockedDate, Photo, PushSubscriptionRow, Reservation, Review, Settings,
} from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

interface DB {
  settings: Settings;
  reservations: Reservation[];
  photos: Photo[];
  blocked_dates: BlockedDate[];
  reviews: Review[];
  push_subscriptions: PushSubscriptionRow[];
}

const DEFAULT_SETTINGS: Settings = {
  id: 1,
  booking_paused: false,
  booking_pause_message: "지금은 준비 중입니다 — 잠시 예약을 쉬어가는 시간을 갖고 있습니다. 곧 다시 찾아뵙겠습니다.",
  booking_resume_date: "",
  hero_badge_text: "집 전체 대여 · 방 선택 없이 자유롭게",
  tagline_visible: false,
  feature1_title: "집 전체 통대여",
  feature1_body: "",
  feature2_title: "",
  feature2_body: "인원 단위 예약으로 가족·친구 모임에 딱 맞습니다.",
  feature3_title: "간편 입금 결제",
  feature3_body: "카카오페이·토스로 바로 송금하세요. 카드 결제 없음.",
  feature1_visible: true,
  feature2_visible: true,
  feature3_visible: true,
  pension_name: "데모 펜션 라온하우",
  tagline: "숲과 별이 있는 집 — 집 전체를 통째로 빌려드립니다",
  description:
    "거실·주방·개별 객실이 모두 갖춰진 단독 주택입니다. 방을 고를 필요 없이, 도착하시면 자유롭게 원하는 공간에서 머무실 수 있습니다. 1박, 1인당 요금제로 운영됩니다.",
  per_person_price: 30000,
  max_guests: 12,
  bank_name: "국민은행",
  account_number: "000000-00-000000",
  account_holder: "(주)라온하우",
  contact_phone: "010-0000-0000",
  check_in_time: "15:00",
  check_out_time: "11:00",
  auto_close_overbook: false,
  address: "",
  map_link: "",
  parking_info: "",
  arrival_info: "",
  updated_at: new Date(0).toISOString(),
};

// ── 데모 시드 예약 (과거 2개월 ~ 미래 1개월 분산, 통계 데모용) ──
function seedReservations(): Reservation[] {
  const t = todayKST();
  const seed: Array<[number, number, number, string, Reservation["status"], string, Reservation["refund_status"]]> = [
    // [체크인 offset(일), 박수, 인원, 이름, 상태, 입금자, 환불상태]
    [-58, 2, 6, "김도윤", "completed", "도윤", "none"],
    [-52, 1, 4, "서지우", "completed", "지우", "none"],
    [-49, 1, 8, "박하늘", "cancelled", "하늘", "done"],
    [-41, 2, 5, "이서준", "completed", "서준", "none"],
    [-35, 1, 3, "정민서", "completed", "민서", "none"],
    [-30, 3, 10, "최유나", "completed", "유나모임", "none"],
    [-24, 1, 4, "강지호", "completed", "지호", "none"],
    [-18, 2, 6, "윤채원", "completed", "채원", "none"],
    [-13, 1, 2, "임태현", "cancelled", "태현", "pending"],
    [-10, 2, 9, "한수아", "completed", "수아", "none"],
    [-6, 1, 5, "오세림", "confirmed", "세림", "none"],
    [-2, 1, 7, "노아름", "confirmed", "아름", "none"],
    [0, 2, 4, "문건우", "confirmed", "건우", "none"],
    [1, 1, 6, "신다원", "confirmed", "다원", "none"],
    [3, 2, 8, "배하람", "pending", "하람", "none"],
    [5, 1, 3, "전시온", "pending", "시온", "none"],
    [9, 2, 10, "고은찬", "pending", "은찬", "none"],
    [15, 1, 5, "온유빈", "confirmed", "유빈", "none"],
    [22, 2, 4, "복지환", "confirmed", "지환", "none"],
  ];
  return seed.map(([offset, nights, guests, name, status, depositor, refund], i) => {
    const check_in = addDays(t, offset);
    return {
      id: crypto.randomUUID(),
      code: `PB-S${String(i + 1).padStart(2, "0")}`,
      guest_name: name,
      phone: "010-1234-5678",
      check_in,
      check_out: addDays(check_in, nights),
      nights,
      guests,
      per_person_price: 30000,
      total_amount: guests * nights * 30000,
      depositor,
      message: "",
      status,
      refund_status: status === "cancelled" ? refund : "none",
      deleted_at: null,
      created_at: new Date(Date.now() + (offset - 10) * 86400000).toISOString(),
      updated_at: new Date().toISOString(),
    };
  });
}

function seedReviews(): Review[] {
  const rows: Array<[string, string, number, string, number]> = [
    // [시드예약코드, 이름, 별점, 후기, offset(일)]
    ["PB-S01", "김도윤", 5, "집 전체를 우리 것으로 만든 기분이었어요. 아이들과 최고의 하루였습니다.", -50],
    ["PB-S04", "이서준", 4, "주방이 잘 갖춰져 있어 단체 요리 모임에 딱이었어요.", -30],
    ["PB-S08", "윤채원", 5, "밤에 별이 가득하던 창가가 기억에 남네요. 재방문 의사 100%.", -15],
  ];
  return rows.map(([code, name, rating, comment, offset]) => ({
    id: crypto.randomUUID(),
    reservation_code: code,
    guest_name: name,
    rating,
    comment,
    visible: true,
    created_at: new Date(Date.now() + offset * 86400000).toISOString(),
  }));
}

async function initDB(): Promise<DB> {
  // public/uploads/seed-*.jpg 가 있으면 갤러리에 자동 등록 (데모 사진 시드)
  let photos: Photo[] = [];
  try {
    const files = (await fs.readdir(UPLOADS_DIR))
      .filter((f) => /^seed-\d+\.jpg$/.test(f))
      .sort();
    photos = files.map((f, i) => ({
      id: crypto.randomUUID(),
      url: `/uploads/${f}`,
      kind: "gallery" as const,
      active: false,
      caption: "",
      sort_order: i,
      created_at: new Date().toISOString(),
    }));
  } catch {
    /* uploads 디렉터리 없음 → 빈 갤러리 */
  }
  return {
    settings: { ...DEFAULT_SETTINGS, updated_at: new Date().toISOString() },
    reservations: seedReservations(),
    photos,
    blocked_dates: [],
    reviews: seedReviews(),
    push_subscriptions: [],
  };
}

async function withLock<T>(queue: Promise<unknown>, fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue.catch(() => {}).then(() => {}, () => {});
  return next as Promise<T>;
}

let queue: Promise<unknown> = Promise.resolve();
function lock<T>(fn: () => Promise<T>): Promise<T> {
  const next = queue.then(fn, fn);
  queue = next.catch(() => {});
  return next as Promise<T>;
}

let cache: DB | null = null;

async function readDB(): Promise<DB> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(DB_PATH, "utf-8")) as DB;
    // 구버전 db.json 호환 (필드 자동 보강)
    cache.blocked_dates ??= [];
    cache.reviews ??= [];
    return cache;
  } catch {
    cache = await initDB();
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DB_PATH, JSON.stringify(cache, null, 2));
    return cache;
  }
}

async function writeDB(db: DB): Promise<void> {
  cache = db;
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2));
}

export const demoStore = {
  async getSettings(): Promise<Settings> {
    const db = await readDB();
    return { ...DEFAULT_SETTINGS, ...db.settings, id: 1 };
  },
  async updateSettings(patch: Partial<Settings>): Promise<Settings> {
    return lock(async () => {
      const db = await readDB();
      db.settings = {
        ...DEFAULT_SETTINGS,
        ...db.settings,
        ...patch,
        id: 1,
        updated_at: new Date().toISOString(),
      };
      await writeDB(db);
      return db.settings;
    });
  },
  async listDeletedReservations(): Promise<Reservation[]> {
    const db = await readDB();
    return db.photos.length >= 0 ? ((db as unknown as { reservations: Reservation[] }).reservations.filter((r: Reservation) => (r as unknown as { deleted_at?: string }).deleted_at)).sort((a, b) => String((b as unknown as { deleted_at?: string }).deleted_at).localeCompare(String((a as unknown as { deleted_at?: string }).deleted_at))) : [];
  },
  async addAuditLog(log: { action: string; target_id: string; target_label?: string; before?: unknown; after?: unknown }): Promise<void> {
    const db = await readDB() as unknown as { audit_logs?: unknown[]; };
    db.audit_logs = db.audit_logs || [];
    db.audit_logs.push({ id: crypto.randomUUID(), actor: "admin", ...log, before: log.before ?? {}, after: log.after ?? {}, created_at: new Date().toISOString() });
    await writeDB(db as never);
  },
  async listAuditLogs(limit = 50): Promise<unknown[]> {
    const db = await readDB() as unknown as { audit_logs?: unknown[] };
    return (db.audit_logs || []).slice(0, limit);
  },
  async listReservations(): Promise<Reservation[]> {
    const db = await readDB();
    return [...db.reservations].sort((a, b) => (a.check_in < b.check_in ? -1 : 1));
  },
  async createReservation(r: Reservation): Promise<Reservation> {
    return lock(async () => {
      const db = await readDB();
      db.reservations.push(r);
      await writeDB(db);
      return r;
    });
  },
  async getReservation(id: string): Promise<Reservation | null> {
    const db = await readDB();
    return db.reservations.find((r) => r.id === id) ?? null;
  },
  async updateReservation(id: string, patch: Partial<Reservation>): Promise<Reservation | null> {
    return lock(async () => {
      const db = await readDB();
      const idx = db.reservations.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      db.reservations[idx] = {
        ...db.reservations[idx],
        ...patch,
        id,
        updated_at: new Date().toISOString(),
      };
      await writeDB(db);
      return db.reservations[idx];
    });
  },
  async listPhotos(): Promise<Photo[]> {
    const db = await readDB();
    return [...db.photos].sort((a, b) => a.sort_order - b.sort_order);
  },
  async updatePhoto(id: string, patch: Partial<Photo>): Promise<Photo | null> {
    return lock(async () => {
      const db = await readDB();
      const idx = db.photos.findIndex((p: Photo) => p.id === id);
      if (idx < 0) return null;
      db.photos[idx] = { ...db.photos[idx], ...patch };
      await writeDB(db);
      return db.photos[idx] as Photo;
    });
  },
  async addPhoto(p: Photo): Promise<Photo> {
    return lock(async () => {
      const db = await readDB();
      db.photos.push(p);
      await writeDB(db);
      return p;
    });
  },
  async deletePhoto(id: string): Promise<boolean> {
    return lock(async () => {
      const db = await readDB();
      const before = db.photos.length;
      db.photos = db.photos.filter((p) => p.id !== id);
      await writeDB(db);
      return db.photos.length < before;
    });
  },
  async listBlockedDates(): Promise<BlockedDate[]> {
    const db = await readDB();
    return [...db.blocked_dates].sort((a, b) => (a.date < b.date ? -1 : 1));
  },
  async addBlockedDate(b: BlockedDate): Promise<BlockedDate> {
    return lock(async () => {
      const db = await readDB();
      db.blocked_dates = db.blocked_dates.filter((x) => x.date !== b.date);
      db.blocked_dates.push(b);
      await writeDB(db);
      return b;
    });
  },
  async removeBlockedDate(date: string): Promise<boolean> {
    return lock(async () => {
      const db = await readDB();
      const before = db.blocked_dates.length;
      db.blocked_dates = db.blocked_dates.filter((x) => x.date !== date);
      await writeDB(db);
      return db.blocked_dates.length < before;
    });
  },
  async listReviews(): Promise<Review[]> {
    const db = await readDB();
    return [...db.reviews].sort((a, b) => b.created_at.localeCompare(a.created_at));
  },
  async addReview(r: Review): Promise<Review> {
    return lock(async () => {
      const db = await readDB();
      db.reviews.unshift(r);
      await writeDB(db);
      return r;
    });
  },
  async updateReview(id: string, patch: Partial<Review>): Promise<Review | null> {
    return lock(async () => {
      const db = await readDB();
      const idx = db.reviews.findIndex((r) => r.id === id);
      if (idx === -1) return null;
      db.reviews[idx] = { ...db.reviews[idx], ...patch, id };
      await writeDB(db);
      return db.reviews[idx];
    });
  },
  async deleteReview(id: string): Promise<boolean> {
    return lock(async () => {
      const db = await readDB();
      const before = db.reviews.length;
      db.reviews = db.reviews.filter((r) => r.id !== id);
      await writeDB(db);
      return db.reviews.length < before;
    });
  },
  async listPushSubscriptions(): Promise<PushSubscriptionRow[]> {
    return (await readDB()).push_subscriptions;
  },
  async savePushSubscription(s: PushSubscriptionRow): Promise<void> {
    return lock(async () => {
      const db = await readDB();
      if (!db.push_subscriptions.some((x) => x.endpoint === s.endpoint)) {
        db.push_subscriptions.push(s);
        await writeDB(db);
      }
    });
  },
  async deletePushSubscription(endpoint: string): Promise<void> {
    return lock(async () => {
      const db = await readDB();
      db.push_subscriptions = db.push_subscriptions.filter((x) => x.endpoint !== endpoint);
      await writeDB(db);
    });
  },
};

export type DemoStore = typeof demoStore;
