import Link from "next/link";
import { CheckCircle2, FileText, Home } from "lucide-react";
import DepositInfo from "@/components/DepositInfo";
import { store } from "@/lib/store";
import { fmtDateKorean, fmtWon } from "@/lib/format";
import { STATUS_LABEL } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0; // 캐시 완전 금지 — 설정 변경이 즉시 반영
export const fetchCache = "force-no-store";

export default async function ReserveDonePage({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const reservation = searchParams.id ? await store.getReservation(searchParams.id) : null;
  if (!reservation) {
    return (
      <main className="max-w-lg mx-auto px-5 py-24 text-center">
        <p className="text-muted-foreground">예약 정보를 찾을 수 없습니다.</p>
        <Link href="/" className="btn-outline mt-6">홈으로</Link>
      </main>
    );
  }
  const s = await store.getSettings();

  return (
    <main className="max-w-lg mx-auto px-5 pb-16">
      <div className="pt-10 pb-6 text-center">
        <CheckCircle2 className="w-16 h-16 text-success mx-auto" />
        <h1 className="mt-4 text-2xl font-black">예약 신청이 접수되었습니다!</h1>
        <p className="text-sm text-muted-foreground mt-2">
          아래 계좌로 입금해 주시면, 관리자가 입금을 확인한 뒤 예약이 확정됩니다.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 rounded-full bg-primary-soft text-primary px-4 py-2 text-sm font-extrabold">
          <FileText className="w-4 h-4" /> 예약코드 <span className="tabular-nums tracking-wider">{reservation.code}</span>
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          예약코드를 몰라도 <b>예약 조회</b>에서 이름·연락처로 찾을 수 있습니다.
        </p>
      </div>

      <DepositInfo
        bank={s.bank_name}
        account={s.account_number}
        holder={s.account_holder}
        amount={reservation.total_amount}
      />

      <div className="card-surface p-5 mt-4">
        <h2 className="font-black mb-3">예약 내용</h2>
        <dl className="text-sm space-y-2.5">
          {[
            ["예약자", `${reservation.guest_name} (${reservation.depositor})`],
            ["연락처", reservation.phone],
            ["투숙 기간", `${fmtDateKorean(reservation.check_in)} ~ ${fmtDateKorean(reservation.check_out)} · ${reservation.nights}박`],
            ["인원", `${reservation.guests}명`],
            ["요금", `${fmtWon(reservation.per_person_price)} × ${reservation.guests}명 × ${reservation.nights}박`],
            ["상태", STATUS_LABEL[reservation.status]],
          ].map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4">
              <dt className="text-muted-foreground shrink-0">{k}</dt>
              <dd className="font-semibold text-right">{v}</dd>
            </div>
          ))}
          <div className="border-t border-border pt-3 flex justify-between">
            <dt className="font-bold">총 입금 금액</dt>
            <dd className="font-extrabold text-primary text-lg tabular-nums">{fmtWon(reservation.total_amount)}</dd>
          </div>
        </dl>
        {reservation.message && (
          <p className="mt-3 rounded-xl bg-muted px-4 py-3 text-sm">요청사항: {reservation.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-6">
        <Link href="/lookup" className="btn-outline">예약 조회·취소</Link>
        <Link href="/" className="btn-primary"><Home className="w-4 h-4" /> 홈으로</Link>
      </div>
    </main>
  );
}
