// ─────────────────────────────────────────────────────────────
//  관리자 웹푸시 전송 (web-push / VAPID)
//  예약 신규·취소 등 관리자에게 중요한 이벤트만 발송
// ─────────────────────────────────────────────────────────────
import "server-only";
import webpush from "web-push";
import { store } from "./store";

const PUB = process.env.VAPID_PUBLIC_KEY || "";
const PRIV = process.env.VAPID_PRIVATE_KEY || "";
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@example.com";
export const pushConfigured = Boolean(PUB && PRIV);

if (pushConfigured) webpush.setVapidDetails(SUBJECT, PUB, PRIV);

/** 등록된 모든 관리자 기기에 푸시 발송 (실패 구독은 자동 정리) */
export async function notifyAdmins(title: string, body: string, url = "/admin"): Promise<void> {
  if (!pushConfigured) {
    console.log(`[push:미설정] ${title} — ${body}`);
    return;
  }
  const subs = await store.listPushSubscriptions();
  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title, body, url })
        );
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await store.deletePushSubscription(s.endpoint); // 만료된 구독 정리
        }
        throw err;
      }
    })
  );
}
