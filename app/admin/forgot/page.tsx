"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

/** 비밀번호 찾기 — 인증된 이메일로 복구 안내 요청 (응답은 항상 동일 — 열거 방지) */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setBusy(true);
    try {
      await fetch("/api/admin/recover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch { /* 네트워크 오류에도 동일 화면 — 열거 방지 */ }
    setSent(true);
    setBusy(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="card-surface p-7 w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
          <Mail className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-center mt-4">비밀번호 찾기</h1>
        {sent ? (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-sm text-muted-foreground leading-relaxed">
              입력하신 이메일로 안내를 보내드렸어요.<br />
              <span className="text-xs">인증된 이메일이 아니라면 아무 메일도 도착하지 않습니다.</span>
            </p>
            <Link href="/admin/login" className="btn-outline w-full !py-2.5 text-sm inline-flex justify-center">로그인으로 돌아가기</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              관리자 페이지의 <b className="text-foreground">보안 탭</b>에서 인증한 이메일을 입력해 주세요.
              비밀번호 복구 안내를 보내드립니다.
            </p>
            <input
              type="email" className="input" placeholder="인증된 이메일" value={email}
              onChange={(e) => setEmail(e.target.value)} required autoFocus
            />
            <button type="submit" className="btn-primary w-full !text-primary-foreground" disabled={busy || !email}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "복구 이메일 받기"}
            </button>
            <Link href="/admin/login" className="block text-center text-xs text-muted-foreground hover:text-foreground">로그인으로 돌아가기</Link>
          </form>
        )}
      </div>
    </main>
  );
}
