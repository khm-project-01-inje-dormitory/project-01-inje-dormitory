import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";
import { STATUS_LABEL, REFUND_LABEL } from "@/types";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

const HEAD = [
  "예약코드", "상태", "환불상태", "예약자", "입금자", "연락처",
  "체크인", "체크아웃", "박수", "인원", "1인가격", "총액", "요청사항", "신청일시",
];

/**
 * CSV 셀 이스케이프 — 큰따옴표 이스케이프 + CSV 인젝션 방어 (M-4)
 * 값이 =, +, -, @, |, \t, \r 로 시작하면 앞에 어퍼스트로피(')를 붙여
 * 엑셀/구글시트가 함수(수식/명령)로 해석하지 않도록 한다.
 */
const esc = (v: string) => {
  const s = (v ?? "").toString();
  const guarded = /^[=+\-@|\t\r]/.test(s) ? `'${s}` : s;
  return `"${guarded.replace(/"/g, '""')}"`;
};

/** 관리자: 기간별 예약 CSV 내보내기 (엑셀 한글 호환 — BOM + CRLF) */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from") || "0000-01-01";
  const to = searchParams.get("to") || "9999-12-31";

  const all = await store.listReservations();
  const rows = all.filter((r) => r.check_in >= from && r.check_in <= to);

  const lines = [HEAD.map(esc).join(",")];
  for (const r of rows) {
    lines.push([
      r.code, STATUS_LABEL[r.status], REFUND_LABEL[r.refund_status], r.guest_name, r.depositor,
      r.phone, r.check_in, r.check_out, String(r.nights), String(r.guests),
      r.per_person_price.toLocaleString(), r.total_amount.toLocaleString(),
      r.message, r.created_at,
    ].map((v) => esc(String(v))).join(","));
  }
  // \uFEFF(BOM): 엑셀에서 UTF-8 한글이 깨지지 않도록
  const csv = "\uFEFF" + lines.join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="reservations-${from}-${to}.csv"`,
    },
  });
}
