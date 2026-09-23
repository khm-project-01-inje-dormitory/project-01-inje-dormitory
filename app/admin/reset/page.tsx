"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, KeyRound, Loader2 } from "lucide-react";

/** 비밀번호 재설정 — 이메일로 받은 1회용 링크(token)로 새 비밀번호 설정 */
export default function ResetPasswordPage() {
  const [token, setToken] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "");
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (next.length < 8) return setError("새 비밀번호는 8자 이상이어야 합니다.");
    if (next === "admin1234") return setError("기본 비밀번호는 사용할 수 없습니다.");
    if (next !== confirm) return setError("새 비밀번호가 일치하지 않습니다.");
    setBusy(true);
    try {
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "재설정 실패");
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "재설정 실패");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <div className="card-surface p-7 w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary-soft text-primary flex items-center justify-center mx-auto">
          <KeyRound className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-center mt-4">새 비밀번호 설정</h1>
        {done ? (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-sm font-bold text-success flex items-center justify-center gap-1.5">
              <Check className="w-4 h-4" /> 비밀번호가 변경되었습니다
            </p>
            <p className="text-xs text-muted-foreground">새 비밀번호로 로그인해 주세요.</p>
            <Link href="/admin/login" className="btn-primary w-full !py-2.5 text-sm !text-primary-foreground inline-flex justify-center">로그인하러 가기</Link>
          </div>
        ) : !token ? (
          <div className="mt-5 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">링크가 올바르지 않습니다. 비밀번호 찾기를 다시 진행해 주세요.</p>
            <Link href="/admin/forgot" className="btn-outline w-full !py-2.5 text-sm inline-flex justify-center">비밀번호 찾기</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-4">
            <div><label className="label">새 비밀번호 (8자 이상)</label><input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoFocus /></div>
            <div><label className="label">새 비밀번호 확인</label><input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
            {error && <p className="text-sm font-semibold text-danger">{error}</p>}
            <button type="submit" className="btn-primary w-full !text-primary-foreground" disabled={busy || !next || !confirm}>
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : "비밀번호 변경"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
