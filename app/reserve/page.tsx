import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import ReservationForm from "@/components/ReservationForm";
import { store } from "@/lib/store";
import { fmtWon } from "@/lib/format";

export const dynamic = "force-dynamic";
export const revalidate = 0; // 캐시 완전 금지 — 설정 변경이 즉시 반영
export const fetchCache = "force-no-store";

export default async function ReservePage() {
  const settings = await store.getSettings();
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
      <ReservationForm price={settings.per_person_price} maxGuests={settings.max_guests} />
    </main>
  );
}
