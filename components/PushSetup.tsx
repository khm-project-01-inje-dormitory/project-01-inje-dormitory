"use client";

import { useEffect, useState } from "react";
import { BellOff, BellRing, Send, Smartphone } from "lucide-react";

/** 관리자 PWA 알림 설정 — 새 예약/취소 시 스마트폰 푸시를 받습니다.
 *  모바일: [아이콘+제목] → [설명 전체폭] → [버튼 풀폭] 세로 스택
 *  데스크톱(sm+): 아이콘 · 텍스트 · 버튼 한 행 배치
 */
export default function PushSetup() {
  const [publicKey, setPublicKey] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    fetch("/api/push/key").then((r) => r.json()).then((d) => setPublicKey(d.publicKey ?? ""));
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(Boolean(sub)))
      .catch(() => {});
  }, []);

  async function enablePush() {
    setMessage("");
    if (!publicKey) {
      setMessage("서버에 VAPID 키가 없습니다. .env.local의 VAPID_* 를 설정해 주세요.");
      return;
    }
    setWorking(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setMessage("브라우저 알림 권한이 거부되었습니다. 설정에서 알림을 허용해 주세요.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as never,
      });
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      });
      if (!res.ok) throw new Error("구독 저장 실패");
      setSubscribed(true);
      setMessage("알림이 켜졌습니다! 새 예약·취소가 들어오면 이 기기로 받습니다.");
    } catch (e) {
      setMessage(e instanceof Error ? `오류: ${e.message}` : "알림 설정 실패");
    } finally {
      setWorking(false);
    }
  }

  async function sendTest() {
    setWorking(true); setMessage("");
    try {
      const res = await fetch("/api/push/test", { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "테스트 알림을 보냈습니다. 알림을 확인해 보세요!" : data.error);
    } finally {
      setWorking(false);
    }
  }

  return (
    <section className="card-surface p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* 아이콘 + 제목: 항상 한 줄, 절대 찌그러지지 않음 */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-11 h-11 rounded-xl bg-primary-soft text-primary flex items-center justify-center shrink-0">
          {subscribed ? <BellRing className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
        </div>
        <h2 className="text-sm font-extrabold leading-tight">
          {subscribed ? "푸시 알림 켜짐" : "푸시 알림 받기"}
        </h2>
      </div>

      {/* 설명: 모바일에서 전체 폭으로 자연스럽게 줄바꿈 */}
      <div className="flex-1 min-w-0 space-y-1 text-xs text-muted-foreground leading-relaxed">
        <p>새 예약·취소가 들어오면 이 기기로 바로 알려드립니다.</p>
        <p className="flex items-start gap-1">
          <Smartphone className="w-3 h-3 mt-0.5 shrink-0" />
          <span>
            안드로이드 크롬: 브라우저 메뉴 → <b>홈 화면에 추가</b>로 앱처럼 설치한 뒤 알림을 켜주세요.
          </span>
        </p>
        {message && <p className="font-semibold text-primary break-keep">{message}</p>}
      </div>

      {/* 버튼: 모바일에서 좌우 분할 풀폭, 데스크톱에서 인라인 */}
      <div className="flex gap-2 shrink-0">
        {!subscribed && (
          <button className="btn-primary flex-1 sm:flex-none !py-2.5 !px-5 text-sm" onClick={enablePush} disabled={working}>
            알림 켜기
          </button>
        )}
        <button className={`btn-outline !py-2.5 !px-5 text-sm ${subscribed ? "flex-1 sm:flex-none" : "flex-1 sm:flex-none"}`} onClick={sendTest} disabled={working || !subscribed}>
          <Send className="w-3.5 h-3.5" /> 테스트
        </button>
      </div>
    </section>
  );
}

/** VAPID 공개키(base64url) → Uint8Array 변환 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from(raw.split("").map((c) => c.charCodeAt(0)));
}
