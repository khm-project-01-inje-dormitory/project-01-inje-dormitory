"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2, MessageCircle } from "lucide-react";

declare global {
  interface Window {
    Kakao?: { init: (k: string) => void; isInitialized?: () => boolean; Share?: { sendDefault: (o: unknown) => void } };
  }
}

/**
 * 예약 안내 공유 — 복사(항상) · 모바일 공유(supported) · 카카오톡 SDK(NEXT_PUBLIC_KAKAO_JS_KEY 설정 시 자동 표시)
 */
export default function ShareReservation({ text, short }: { text: string; short: string }) {
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const kakaoKey = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;

  useEffect(() => { setCanShare(typeof navigator !== "undefined" && "share" in navigator); }, []);

  useEffect(() => {
    if (!kakaoKey || document.getElementById("kakao-sdk")) return;
    const sc = document.createElement("script");
    sc.id = "kakao-sdk";
    sc.src = "https://developers.kakao.com/sdk/js/kakao.js";
    sc.async = true;
    document.body.appendChild(sc);
  }, [kakaoKey]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function share() {
    if (canShare) {
      try { await navigator.share({ text }); return; } catch { /* 취소 시 무시 */ }
    }
    copy();
  }

  function kakao() {
    if (!kakaoKey || !window.Kakao) return;
    if (!window.Kakao.isInitialized?.()) window.Kakao.init(kakaoKey);
    window.Kakao.Share?.sendDefault({
      objectType: "text",
      text: short,
      link: { mobileWebUrl: window.location.origin, webUrl: window.location.origin },
    });
  }

  const btn = "!py-2.5 flex-1 text-sm inline-flex items-center justify-center gap-1.5";
  return (
    <div className="flex gap-2">
      <button type="button" onClick={copy} className={`btn-outline ${btn}`}>
        {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
        {copied ? "복사 완료!" : "안내문 복사"}
      </button>
      {canShare && (
        <button type="button" onClick={share} className={`btn-outline ${btn}`}>
          <Share2 className="w-4 h-4" /> 공유
        </button>
      )}
      {kakaoKey && (
        <button type="button" onClick={kakao} className={`btn-primary ${btn}`}>
          <MessageCircle className="w-4 h-4" /> 카톡 전송
        </button>
      )}
    </div>
  );
}
