"use client";

import { useEffect, useState } from "react";
import { Check, KeyRound, Loader2, Mail, MailCheck, ShieldCheck, TriangleAlert } from "lucide-react";

interface Status {
  emailConfigured: boolean;
  adminEmail: string;
  verified: boolean;
  hasHash: boolean;
}

/** 보안 탭 — 인증된 이메일(비밀번호 찾기) + 비밀번호 변경 */
export default function SecurityTab() {
  const [status, setStatus] = useState<Status | null>(null);

  // 비밀번호 변경
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // 인증된 이메일
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [stage, setStage] = useState<"idle" | "code">("idle");
  const [mailBusy, setMailBusy] = useState(false);
  const [mailMsg, setMailMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/security")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d) {
          setStatus(d);
          setEmail(d.adminEmail || "");
        }
      })
      .catch(() => {});
  }, []);

  /** 비밀번호 변경 — 설정 저장과 무관하게 즉시 DB 반영 */
  async function changePassword() {
    setPwMsg(null);
    if (next.length < 8) return setPwMsg({ ok: false, text: "새 비밀번호는 8자 이상이어야 합니다." });
    if (next === "admin1234") return setPwMsg({ ok: false, text: "기본 비밀번호는 사용할 수 없습니다." });
    if (next !== confirm) return setPwMsg({ ok: false, text: "새 비밀번호가 일치하지 않습니다." });
    setPwBusy(true);
    try {
      const res = await fetch("/api/admin/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current: cur, next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "변경 실패");
      setPwMsg({ ok: true, text: "✓ 비밀번호가 변경되었습니다" });
      setCur(""); setNext(""); setConfirm("");
      fetch("/api/admin/security").then((r) => r.json()).then((d) => setStatus(d)).catch(() => {});
    } catch (e) {
      setPwMsg({ ok: false, text: e instanceof Error ? e.message : "변경 실패" });
    } finally {
      setPwBusy(false);
    }
  }

  /** 인증 코드 발송 — 이메일 저장(미인증 전환) + 코드 메일 */
  async function sendCode() {
    setMailMsg(null);
    setMailBusy(true);
    try {
      const res = await fetch("/api/admin/security/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "발송 실패");
      setStage("code");
      setMailMsg({ ok: true, text: data.sent ? "인증 코드를 보내드렸어요. 메일함을 확인해 주세요." : "저장은 완료되었지만 발송에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    } catch (e) {
      setMailMsg({ ok: false, text: e instanceof Error ? e.message : "발송 실패" });
    } finally {
      setMailBusy(false);
    }
  }

  /** 인증 코드 확인 — 통과 시 이메일이 "인증됨" 상태로 승격 */
  async function verifyCode() {
    setMailMsg(null);
    setMailBusy(true);
    try {
      const res = await fetch("/api/admin/security/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "인증 실패");
      setStage("idle"); setCode("");
      setMailMsg({ ok: true, text: "✓ 이메일 인증이 완료되었습니다 — 이제 비밀번호 찾기를 사용할 수 있어요." });
      const d = await fetch("/api/admin/security").then((r) => r.json());
      setStatus(d);
    } catch (e) {
      setMailMsg({ ok: false, text: e instanceof Error ? e.message : "인증 실패" });
    } finally {
      setMailBusy(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-5">
      {/* ── 인증된 이메일 (비밀번호 찾기) ── */}
      <section className="card-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Mail className="w-5 h-5 text-primary" />
          <h3 className="font-black">인증된 이메일</h3>
          {status?.verified && (
            <span className="badge bg-success/10 text-success border border-success/20"><MailCheck className="w-3 h-3" /> 인증 완료</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed break-keep">
          비밀번호 분실 시 <b className="text-foreground">인증된 이메일로 찾을 수 있어요</b>. 로그인 화면의
          "비밀번호 찾기"에서 복구 안내(또는 재설정 링크)를 받을 수 있습니다. 인증된 이메일만 복구에 사용됩니다.
        </p>
        {status && !status.emailConfigured && (
          <div className="flex items-start gap-2 rounded-xl bg-warning/10 border border-warning/20 text-warning px-4 py-3 text-sm font-medium">
            <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="break-keep leading-relaxed">
              이메일 발송 설정이 필요합니다 — Vercel 환경변수에 <span className="font-bold whitespace-nowrap">RESEND_API_KEY</span>를 추가한 뒤 다시 시도해 주세요.
            </span>
          </div>
        )}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="email" className="input flex-1" placeholder="admin@example.com"
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <button className="btn-outline shrink-0 !py-2.5" onClick={sendCode} disabled={mailBusy || !email || (status?.adminEmail === email && status?.verified)}>
            {mailBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
            {status?.adminEmail === email && status?.verified ? "인증 완료됨" : "코드 발송"}
          </button>
        </div>
        {stage === "code" && (
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              className="input flex-1 text-center tracking-widest" placeholder="6자리 인증 코드" inputMode="numeric" maxLength={6}
              value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            />
            <button className="btn-primary shrink-0 !py-2.5 !text-primary-foreground" onClick={verifyCode} disabled={mailBusy || code.length !== 6}>
              {mailBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> 인증 완료</>}
            </button>
          </div>
        )}
        {mailMsg && <p className={`text-xs font-semibold ${mailMsg.ok ? "text-success" : "text-danger"}`}>{mailMsg.text}</p>}
      </section>

      {/* ── 비밀번호 변경 ── */}
      <section className="card-surface p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-primary" />
          <h3 className="font-black">비밀번호 변경</h3>
        </div>
        <div className="space-y-3 max-w-md">
          <div><label className="label">현재 비밀번호</label><input type="password" className="input" value={cur} onChange={(e) => setCur(e.target.value)} /></div>
          <div><label className="label">새 비밀번호 (8자 이상)</label><input type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} /></div>
          <div><label className="label">새 비밀번호 확인</label><input type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} /></div>
          <button className="btn-primary w-full !text-primary-foreground" onClick={changePassword} disabled={pwBusy || !cur || !next || !confirm}>
            {pwBusy ? <Loader2 className="w-5 h-5 animate-spin" /> : "비밀번호 변경"}
          </button>
          {pwMsg && <p className={`text-xs font-semibold ${pwMsg.ok ? "text-success" : "text-danger"}`}>{pwMsg.text}</p>}
        </div>
      </section>

      {/* ── 복구 방식 안내 ── */}
      <section className="card-surface p-5 sm:p-6 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          <h3 className="font-black">비밀번호 찾기 방식</h3>
        </div>
        <ul className="text-sm text-muted-foreground space-y-2 leading-relaxed break-keep">
          <li>• 비밀번호 변경 이력이 {status?.hasHash ? (
            <><b className="text-foreground">있음</b> → 인증된 이메일로 <b className="text-foreground">1회용 재설정 링크</b>를 보내드립니다 (15분 유효).</>
          ) : (
            <><b className="text-foreground">없음</b> → 인증된 이메일로 <b className="text-foreground">기본(환경변수) 비밀번호</b>를 보내드립니다.</>
          )}</li>
          <li>• 복구 요청은 시간당 3회로 제한되며, 어떤 이메일을 입력해도 응답 형식이 같아 계정 존재 여부가 노출되지 않습니다.</li>
          <li>• 재설정 링크는 1회 사용 즉시 무효화되며, 사용 기록은 감사로그에 남습니다.</li>
        </ul>
      </section>
    </div>
  );
}
