"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "로그인 실패");
      }
      router.push("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "로그인 실패");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-5">
      <form onSubmit={submit} className="card-surface p-7 w-full max-w-sm">
        <div className="w-14 h-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto">
          <LockKeyhole className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-black text-center mt-4">관리자 로그인</h1>
        <p className="text-xs text-muted-foreground text-center mt-1">
          비밀번호는 환경변수 <code className="font-mono">ADMIN_PASSWORD</code>로 설정됩니다.
        </p>
        <input
          type="password" className="input mt-6 text-center tracking-widest" placeholder="비밀번호"
          value={password} onChange={(e) => setPassword(e.target.value)} autoFocus
        />
        {error && <p className="text-sm font-semibold text-danger mt-3 text-center">{error}</p>}
        <button type="submit" className="btn-primary w-full mt-4" disabled={loading || !password}>
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "로그인"}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-4">
          데모 기본 비밀번호: <code className="font-mono">admin1234</code> (운영 전 반드시 변경)
        </p>
      </form>
    </main>
  );
}
