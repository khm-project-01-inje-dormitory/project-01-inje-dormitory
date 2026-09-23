import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

/**
 * 관리자 기기의 푸시 구독 저장 — 관리자 로그인 세션 필요 (M-6).
 * 관리자는 설정 탭에서 이미 로그인 상태이므로 UX 영향 없음.
 * endpoint는 신뢰할 수 있는 푸시 서비스 도메인만 허용(FCM/Mozilla/Apple/Windows).
 */
const TRUSTED_HOSTS = [
  "fcm.googleapis.com",           // Chrome/Android
  "updates.push.services.mozilla.com", // Firefox
  "web.push.apple.com",           // Safari
  "wns2-am3p.notify.windows.com", // Edge (Windows)
];

function isTrustedEndpoint(endpoint: string): boolean {
  try {
    const u = new URL(endpoint);
    if (u.protocol !== "https:") return false;
    return TRUSTED_HOSTS.some((h) => u.hostname === h || u.hostname.endsWith("." + h.split(".").slice(-3).join(".")));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const sub = await req.json().catch(() => null);
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth)
    return NextResponse.json({ error: "구독 정보가 올바르지 않습니다." }, { status: 400 });
  if (!isTrustedEndpoint(String(sub.endpoint)))
    return NextResponse.json({ error: "허용되지 않은 푸시 서비스 endpoint입니다." }, { status: 400 });

  await store.savePushSubscription({
    id: crypto.randomUUID(),
    endpoint: sub.endpoint,
    p256dh: sub.keys.p256dh,
    auth: sub.keys.auth,
    created_at: new Date().toISOString(),
  });
  return NextResponse.json({ ok: true });
}

/** 푸시 구독 해제 — 관리자 세션 필요 */
export async function DELETE(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (endpoint) await store.deletePushSubscription(endpoint);
  return NextResponse.json({ ok: true });
}
