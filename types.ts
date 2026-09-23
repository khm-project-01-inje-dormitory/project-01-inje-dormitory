// ─────────────────────────────────────────────────────────────
//  공통 타입 정의 (데모/Supabase 양쪽 모드에서 동일하게 사용)
// ─────────────────────────────────────────────────────────────

export type ReservationStatus = "pending" | "confirmed" | "cancelled" | "completed";

/** 입금대기(pending) → 입금확정(confirmed) → 투숙완료(completed) / 취소(cancelled) */
export const STATUS_LABEL: Record<ReservationStatus, string> = {
  pending: "입금대기",
  confirmed: "예약확정",
  cancelled: "취소",
  completed: "투숙완료",
};

/** 환불 상태 — 취소된 예약에서만 의미 있음 */
export type RefundStatus = "none" | "pending" | "done";
export const REFUND_LABEL: Record<RefundStatus, string> = {
  none: "",
  pending: "환불대기",
  done: "환불완료",
};

export interface Reservation {
  id: string;
  /** 예약코드 (예: PB-7K3M) — 참고용 식별자 (조회는 이름+연락처 지원) */
  code: string;
  guest_name: string;
  phone: string;
  /** YYYY-MM-DD (KST) */
  check_in: string;
  check_out: string;
  nights: number;
  guests: number;
  /** 예약 시점의 1인당 가격 (설정 변경 이후에도 예약 단위로 보존) */
  per_person_price: number;
  total_amount: number;
  /** 입금자명 (기본값 = 예약자명) */
  depositor: string;
  message: string;
  status: ReservationStatus;
  /** 취소 시 환불 처리 현황 */
  refund_status: RefundStatus;
  created_at: string;
  updated_at: string;
  /** 소프트 삭제(숨김) 시각 — null이면 정상 표시 건 */
  deleted_at: string | null;
}

export interface Settings {
  id: number;
  pension_name: string;
  tagline: string;
  description: string;
  /** 1인당 1박 요금 (원) — 관리자가 대시보드에서 10,000~50,000 범위로 수정 */
  per_person_price: number;
  /** 수용 가능 최대 인원 (동일 날짜 기준) */
  max_guests: number;
  bank_name: string;
  account_number: string;
  account_holder: string;
  contact_phone: string;
  /** 관리자 비밀번호 해시 (salt:sha256) — 빈 값이면 환경변수 ADMIN_PASSWORD 사용 */
  admin_password_hash: string;
  /** 비밀번호 찾기용 인증된 이메일 (미인증이면 복구 불가) */
  admin_email: string;
  admin_email_verified: boolean;
  check_in_time: string;
  check_out_time: string;
  /** 수용 인원 초과 신청 자동 차단 (false = 경고 후 접수) */
  auto_close_overbook: boolean;
  /** 위치·주차 안내 */
  address: string;
  map_link: string;
  parking_info: string;
  arrival_info: string;
  /** 예약 일시중지 (해외 출장·휴무 등) — 켜면 예약 전면 차단 */
  booking_paused: boolean;
  /** 중지 안내 문구 (관리자 편집) */
  booking_pause_message: string;
  /** 재개 예정일 (YYYY-MM-DD, 선택) — 날짜가 되면 자동 재개 */
  booking_resume_date: string;
  /** 히어로 배지 문구 (집 아이콘 우측 텍스트) */
  hero_badge_text: string;
  hero_badge_visible: boolean;
  /** 한줄소개 표시 토글 — 켜면 제목 아래에 표시 */
  tagline_visible: boolean;
  /** 메인 소개 카드 3개 — 관리자 편집/숨김 (빈 값이면 기본 문구 사용) */
  feature1_title: string;
  feature1_body: string;
  feature2_title: string;
  feature2_body: string;
  feature3_title: string;
  feature3_body: string;
  feature1_visible: boolean;
  feature2_visible: boolean;
  feature3_visible: boolean;
  updated_at: string;
}

export interface Photo {
  id: string;
  /** 표시용 URL (데모: /uploads/... / Supabase: Storage public URL) */
  url: string;
  /** hero = 대문(히어로) 대형 이미지 / gallery = 소개 갤러리 (기존 데이터는 gallery 취급) */
  kind: "hero" | "gallery";
  /** 대문 사진 중 현재 홈 대문에 표시되는 1장 (hero만 의미 있음) */
  active: boolean;
  caption: string;
  sort_order: number;
  created_at: string;
}

/** 관리자가 지정한 예약 불가 날짜 (휴무일) */
export interface BlockedDate {
  date: string;
  reason: string;
  created_at: string;
}

export interface Review {
  id: string;
  reservation_code: string;
  guest_name: string;
  /** 1~5 */
  rating: number;
  comment: string;
  visible: boolean;
  created_at: string;
}

export interface PushSubscriptionRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}

/** 날짜별 투숙 현황 (박 단위) */
export interface DayAvailability {
  date: string;
  /** 확정+대기 합산 인원 */
  booked: number;
  remaining: number;
  /** 관리자 지정 휴무일 */
  blocked?: boolean;
}

/** 관리자 조작 감사로그 (제안 B) */
export interface AuditLog {
  id: string;
  actor: string;          // "admin"
  action: string;         // hide | restore | purge | status | refund | settings ...
  target_id: string;      // 대상 행 id
  target_label: string;   // 예약코드 등 (삭제돼도 식별 가능)
  before: string;         // 변경 전 스냅샷 (JSON)
  after: string;          // 변경 후 스냅샷 (JSON)
  created_at: string;
}

/** 관리자 이메일 인증·복구 토큰 (해시만 저장 — 원본은 이메일/링크로만 전달) */
export interface EmailToken {
  id: string;
  email: string;
  token_hash: string;
  purpose: "verify_email" | "recover";
  used: boolean;
  expires_at: string;
  created_at: string;
}
