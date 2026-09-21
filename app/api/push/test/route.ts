import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/auth";
import { notifyAdmins, pushConfigured } from "@/lib/push";

/** 관리자: 푸시 테스트 발송 */
export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  if (!pushConfigured)
    return NextResponse.json(
      { error: "VAPID 키가 설정되지 않았습니다. .env.local의 VAPID_* 값을 채워주세요." },
      { status: 400 }
    );
  await notifyAdmins("🧪 테스트 알림", "웹푸시가 정상 동작합니다! 예약·취소 시 이렇게 받아보실 수 있어요.");
  return NextResponse.json({ ok: true });
}
