import { NextResponse } from "next/server";
import { store } from "@/lib/store";

/** 관리자 기기의 푸시 구독 저장 */
export async function POST(req: Request) {
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });

  await store.savePushSubscription({
    id: crypto.randomUUID(),
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

/** 푸시 구독 해제 */
export async function DELETE(req: Request) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) await store.deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
