import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReservationForm from "@/components/ReservationForm";
import { store } from "@/lib/store";
import { fmtWon, todayKST } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0; // 캐시 완전 금지 — 설정 변경이 즉시 반영
export const fetchCache = "force-no-store";

export default async function ReservePage() {
  const settings = await store.getSettings();
  // 예약 일시중지 — 재개 예정일 자동 복귀 후 판정
  let paused = Boolean(settings.booking_paused);
  if (paused && settings.booking_resume_date && /^\d{4}-\d{2}-\d{2}$/.test(settings.booking_resume_date) && todayKST() >= settings.booking_resume_date) {
    paused = false;
  }
  if (paused) {
    return (
      <main className="max-w-lg mx-auto px-5 pb-16">
      <div className="text-center text-sm text-muted-foreground">
        이미 예약하셨나요?{" "}
        <Link href="/lookup" className="font-bold text-primary underline underline-offset-2">예약 조회·수정</Link>
      </div>
        <div className="py-5 flex items-center gap-3">
          <Link href="/" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-black">예약 신청</h1>
        </div>
        <div className="card-surface p-8 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-warning/10 border border-warning/20 flex items-center justify-center mx-auto text-2xl">🌊</div>
          <h2 className="font-black text-lg">지금은 예약을 쉬어가는 중입니다</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{settings.booking_pause_message || "현재 예약이 일시 중지되어 있습니다."}</p>
          {settings.booking_resume_date && /^\d{4}-\d{2}-\d{2}$/.test(settings.booking_resume_date) && (
            <p className="text-sm font-bold text-primary">예약은 {settings.booking_resume_date.replace(/-/g, ".")}부터 가능합니다.</p>
          )}
          <p className="text-xs text-muted-foreground">기존 예약자분은 홈 하단 '예약 조회'에서 조회·취소할 수 있습니다.</p>
        </div>
      </main>
    );
  }
  return (
    <main className="max-w-lg mx-auto px-5 pb-16">
      <div className="py-5 flex items-center gap-3">
        <Link href="/" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-muted">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black">예약 신청</h1>
          <p className="text-xs text-muted-foreground">
            1인·1박 {fmtWon(settings.per_person_price)} · 최대 {settings.max_guests}명
          </p>
        </div>
      </div>
      <ReservationForm price={settings.per_person_price} maxGuests={settings.max_guests} autoCloseOverbook={Boolean(settings.auto_close_overbook)} />
    </main>
  );
}
