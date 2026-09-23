"use client";

import { useEffect, useState } from "react";
import { CalendarOff, Loader2, Plus, Save, X, ShieldCheck } from "lucide-react";
import { fmtWon } from "@/lib/format";
import type { BlockedDate, Settings } from "@/types";

/** 사이트 설정 — 요금/인원/휴무일/마감정책/위치·주차/계좌/소개 */
export default function SettingsTab({ settings }: { settings: Settings }) {
  const [form, setForm] = useState<Settings>(settings);
  const [pw, setPw] = useState({ cur: "", next: "", confirm: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwOk, setPwOk] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  const [pwOpen, setPwOpen] = useState(false);
  const [priceText, setPriceText] = useState(String(settings.per_person_price));
  const [maxGuestsText, setMaxGuestsText] = useState(String(settings.max_guests));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  // 휴무일
  const [blocked, setBlocked] = useState<BlockedDate[]>([]);
  const [blockDate, setBlockDate] = useState("");
  const [blockReason, setBlockReason] = useState("");
  const [blockBusy, setBlockBusy] = useState(false);

  const price = Number(priceText) || 0;
  const maxGuests = Number(maxGuestsText) || 0;
  const priceInvalid = priceText !== "" && (price < 10000 || price > 50000);
  const digitsOnly = (s: string) => s.replace(/\D/g, "").slice(0, 6);

  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    fetch("/api/blocked-dates").then((r) => r.json()).then((d) => setBlocked(d.blocked ?? [])).catch(() => {});
  }, []);

  async function addBlocked() {
    if (!blockDate) return;
    setBlockBusy(true);
    try {
      const res = await fetch("/api/blocked-dates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: blockDate, reason: blockReason }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setBlocked((prev) => [...prev.filter((b) => b.date !== blockDate), d.blocked].sort((a, b) => a.date.localeCompare(b.date)));
      setBlockDate(""); setBlockReason("");
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "휴무일 추가 실패" });
    } finally {
      setBlockBusy(false);
    }
  }

  async function removeBlocked(date: string) {
    await fetch(`/api/blocked-dates/${date}`, { method: "DELETE" });
    setBlocked((prev) => prev.filter((b) => b.date !== date));
  }

  async function save() {
    if (priceText === "" || price < 10000 || price > 50000) {
      setMessage({ ok: false, text: "1인당 요금은 10,000원~50,000원 사이여야 합니다." });
      return;
    }
    if (maxGuestsText === "" || maxGuests < 1 || maxGuests > 100) {
      setMessage({ ok: false, text: "최대 인원은 1~100명 사이여야 합니다." });
      return;
    }
    setSaving(true); setMessage(null);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, per_person_price: price, max_guests: maxGuests }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");
      setForm(data.settings);
      setPriceText(String(data.settings.per_person_price));
      setMaxGuestsText(String(data.settings.max_guests));
      setMessage({ ok: true, text: "저장되었습니다. 사이트와 예약 화면에 즉시 반영됩니다." });
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : "저장 실패" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-6xl space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-black">사이트 설정</h2>
        <button type="button" onClick={() => setPwOpen(true)}
          className="btn-outline !py-2 !px-3.5 text-xs inline-flex items-center gap-1.5 shrink-0 hover:scale-[1.03] active:scale-95 transition-transform">
          <ShieldCheck className="w-3.5 h-3.5" /> 비밀번호 변경
        </button>
      </div>

      {/* 예약 마감 정책 */}
      <div className="card-surface p-5">
        <h3 className="font-black mb-1">예약 자동 마감</h3>
        <p className="text-xs text-muted-foreground mb-3">
          수용 인원이 가득 찬 날짜에 대한 신청 처리 방식을 정합니다.
        </p>
        <label className="flex items-center justify-between gap-4 cursor-pointer rounded-xl border border-border px-4 py-3.5 hover:bg-muted/60 transition-colors">
          <span>
            <b className="text-sm block">{form.auto_close_overbook ? "초과 신청 자동 차단" : "경고 후 접수 (기본)"}</b>
            <span className="text-xs text-muted-foreground">
              {form.auto_close_overbook
                ? "인원이 가득 찬 날짜는 아예 예약 신청이 안 됩니다. 초과·환불 사고가 원천 차단됩니다."
                : "초과 신청도 받아두고 관리자가 판단해 거절할 수 있습니다. (신청 시 경고 표시)"}
            </span>
          </span>
          <input type="checkbox" className="sr-only" checked={form.auto_close_overbook}
            onChange={(e) => set("auto_close_overbook", e.target.checked)} />
          <span className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${form.auto_close_overbook ? "bg-primary" : "bg-muted border border-border"}`}>
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.auto_close_overbook ? "left-[22px]" : "left-0.5"}`} />
          </span>
        </label>
      </div>
      {/* 휴무일 관리 */}
      <div className="card-surface p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CalendarOff className="w-4 h-4 text-primary" />
          <h3 className="font-black">휴무일 — 예약 불가 날짜 차단</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          청소·사적사용 날짜를 지정하면 예약 화면에 <b>휴무</b>로 표시되고 신청이 자동 차단됩니다.
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <input type="date" className="input max-w-[160px]" value={blockDate}
            onChange={(e) => setBlockDate(e.target.value)} />
          <input className="input flex-1 min-w-[140px]" placeholder="사유 (예: 청소, 사적사용)"
            value={blockReason} onChange={(e) => setBlockReason(e.target.value)} />
          <button className="btn-primary !py-2.5 !px-4 text-sm" onClick={addBlocked} disabled={blockBusy || !blockDate}>
            <Plus className="w-4 h-4" /> 추가
          </button>
        </div>
        {blocked.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {blocked.map((b) => (
              <span key={b.date} className="badge bg-muted text-muted-foreground border border-border/40 gap-1.5">
                {b.date}{b.reason ? ` · ${b.reason}` : ""}
                <button onClick={() => removeBlocked(b.date)} className="hover:text-danger" title="해제">
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">지정된 휴무일이 없습니다.</p>
        )}
      </div>
      {/* 예약 일시중지 — 안내문·재개일 (토글은 대시보드 헤더 아래에 있음) */}
      <div className="card-surface p-5 space-y-3">
        <h3 className="font-black">예약 일시중지 안내 (출장·휴무)</h3>
        <p className="text-xs text-muted-foreground">토글은 대시보드 상단에 있습니다. 여기서 안내 문구와 재개 예정일을 지정하세요 — 재개일이 지나면 예약이 자동으로 다시 열립니다.</p>
        <div>
          <label className="label">중지 안내 문구</label>
          <textarea className="input min-h-[64px] resize-none" value={form.booking_pause_message || ""} maxLength={200}
            onChange={(e) => set("booking_pause_message", e.target.value)}
            placeholder="지금은 준비 중입니다 — 잠시 예약을 쉬어가는 시간을 갖고 있습니다." />
        </div>
        <div>
          <label className="label">재개 예정일 (선택 — 지나면 자동 재개)</label>
          <input type="date" className="input max-w-[180px]" value={form.booking_resume_date || ""}
            onChange={(e) => set("booking_resume_date", e.target.value)} />
        </div>
      </div>
      {/* 히어로 배지 + 한줄소개 표시 (메인 최상단 순서) */}
      <div className="card-surface p-5 space-y-4">
        <h3 className="font-black">메인 히어로 (최상단 배너)</h3>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="label">배지 문구 <span className="text-muted-foreground font-normal ml-1">🏠 아이콘 우측 텍스트</span></label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold shrink-0"><input type="checkbox" checked={form.hero_badge_visible !== false} onChange={(e) => set("hero_badge_visible", e.target.checked)} className="w-4 h-4 accent-primary" aria-label="배지 표시" />표시</label>
          </div>
          <input className="input" value={form.hero_badge_text || ""} maxLength={40}
            onChange={(e) => set("hero_badge_text", e.target.value)} placeholder="집 전체 대여 · 방 선택 없이 자유롭게" />
        </div>
      </div>
      {/* 숙소 소개 */}
      <div className="card-surface p-5 space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground">숙소 소개</h3>
        <div>
          <label className="label">숙소 이름</label>
          <input className="input" value={form.pension_name} onChange={(e) => set("pension_name", e.target.value)} />
        </div>
        <div>
          <div className="flex items-center justify-between gap-3">
            <label className="label">한 줄 소개</label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold shrink-0"><input type="checkbox" checked={form.tagline_visible === true} onChange={(e) => set("tagline_visible", e.target.checked)} className="w-4 h-4 accent-primary" aria-label="한 줄 소개 메인 표시" />표시</label>
          </div>
          <input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </div>
        <div>
          <label className="label">상세 설명</label>
          <textarea className="input min-h-[100px] resize-none" value={form.description}
            onChange={(e) => set("description", e.target.value)} />
        </div>
      </div>
      {/* 메인 소개 카드 편집/표시 (3개) */}
      <div className="card-surface p-5 space-y-4">
        <div>
          <h3 className="font-black">메인 소개 카드</h3>
          <p className="text-xs text-muted-foreground mt-1">홈 화면 소개 섹션의 카드 3개 — 제목·내용을 바꾸거나 표시를 끌 수 있습니다.</p>
        </div>
        {([1, 2, 3] as const).map((n) => {
          const tKey = `feature${n}_title` as keyof Settings;
          const bKey = `feature${n}_body` as keyof Settings;
          const vKey = `feature${n}_visible` as keyof Settings;
          const title = String(form[tKey] ?? "");
          const body = String(form[bKey] ?? "");
          const visible = form[vKey] !== false;
          return (
            <div key={n} className="rounded-xl border border-border p-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <b className="text-sm">카드 {n}</b>
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
                  <input type="checkbox" checked={visible} onChange={(e) => set(vKey, e.target.checked as never)} className="w-4 h-4 accent-primary" />
                  표시
                </label>
              </div>
              <input className="input" placeholder="제목" value={title} maxLength={30}
                onChange={(e) => set(tKey, e.target.value as never)} disabled={!visible} />
              <textarea className="input min-h-[56px] resize-none" placeholder="내용" value={body} maxLength={120}
                onChange={(e) => set(bKey, e.target.value as never)} disabled={!visible} />
            </div>
          );
        })}
        <p className="text-xs text-muted-foreground">카드 1 내용을 비우면 한줄소개(태그라인)가 자동으로 들어갑니다.</p>
      </div>
      {/* 요금 · 수용 인원 · 시간 */}
      <div className="card-surface p-5 space-y-5">
        <div>
          <label className="label">
            1인당 투숙 요금 (1박)
            <span className="text-muted-foreground font-normal ml-2">10,000원 ~ 50,000원</span>
          </label>
          <div className="flex items-center gap-3">
            <input
              type="text" inputMode="numeric" enterKeyHint="done"
              className={`input max-w-[180px] ${priceInvalid ? "!border-danger" : ""}`}
              placeholder="예: 30000" value={priceText}
              onChange={(e) => setPriceText(digitsOnly(e.target.value))}
            />
            <span className="text-sm font-extrabold text-primary">{price > 0 ? fmtWon(price) : "금액을 입력하세요"}</span>
          </div>
          {priceInvalid && <p className="text-xs text-danger mt-1.5 font-semibold">허용 범위(1만~5만원)를 벗어났습니다.</p>}
          <div className="flex gap-2 mt-2.5">
            {[10000, 20000, 30000, 40000, 50000].map((v) => (
              <button key={v} onClick={() => setPriceText(String(v))}
                className={`badge border ${price === v ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border"} hover:border-primary`}>
                {v / 10000}만원
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">수용 가능 최대 인원</label>
            <input
              type="text" inputMode="numeric"
              className="input" placeholder="예: 12" value={maxGuestsText}
              onChange={(e) => setMaxGuestsText(digitsOnly(e.target.value))}
            />
          </div>
          <div>
            <label className="label">문의 전화</label>
            <input className="input" value={form.contact_phone}
              onChange={(e) => set("contact_phone", e.target.value)} placeholder="010-0000-0000" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">체크인 시간</label>
            <input type="time" className="input" value={form.check_in_time}
              onChange={(e) => set("check_in_time", e.target.value)} />
          </div>
          <div>
            <label className="label">체크아웃 시간</label>
            <input type="time" className="input" value={form.check_out_time}
              onChange={(e) => set("check_out_time", e.target.value)} />
          </div>
        </div>
      </div>
      {/* 위치 · 주차 안내 */}
      <div className="card-surface p-5 space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground">위치 · 주차 안내 (메인페이지 노출)</h3>
        <div>
          <label className="label">주소</label>
          <input className="input" value={form.address} onChange={(e) => set("address", e.target.value)}
            placeholder="예: 강원도 인제군 ..." />
        </div>
        <div>
          <label className="label">지도 링크 <span className="text-muted-foreground font-normal">· 미입력 시 주소로 자동 생성</span></label>
          <input className="input" value={form.map_link} onChange={(e) => set("map_link", e.target.value)}
            placeholder="카카오맵/네이버지도 공유 링크" />
        </div>
        <div>
          <label className="label">주차 안내</label>
          <input className="input" value={form.parking_info} onChange={(e) => set("parking_info", e.target.value)}
            placeholder="예: 전면 주차장 4대 주차 가능" />
        </div>
        <div>
          <label className="label">오시는 길 안내</label>
          <textarea className="input min-h-[72px] resize-none" value={form.arrival_info}
            onChange={(e) => set("arrival_info", e.target.value)}
            placeholder="예: 버스터미널에서 택시로 10분, 펜션 입구 표지판을 따라 올라오세요." />
        </div>
      </div>
      {/* 입금 계좌 */}
      <div className="card-surface p-5 space-y-4">
        <h3 className="font-bold text-sm text-muted-foreground">입금 계좌 (토스 송금 버튼에 사용)</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="label">은행</label>
            <input className="input" value={form.bank_name} onChange={(e) => set("bank_name", e.target.value)} placeholder="국민은행" />
          </div>
          <div className="col-span-2">
            <label className="label">계좌번호</label>
            <input className="input" value={form.account_number} onChange={(e) => set("account_number", e.target.value)} placeholder="000000-00-000000" />
          </div>
        </div>
        <div>
          <label className="label">예금주</label>
          <input className="input" value={form.account_holder} onChange={(e) => set("account_holder", e.target.value)} />
        </div>
      </div>













      {message && (
        <p className={`text-sm font-semibold ${message.ok ? "text-success" : "text-danger"}`}>{message.text}</p>
      )}
      <button className="btn-primary w-full !py-4" onClick={save} disabled={saving}>
        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-4 h-4" />} 설정 저장
      </button>

      {/* 비밀번호 변경 모달 — 설정 저장과 독립 동작 */}
      {pwOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setPwOpen(false)}>
          <div className="card-surface p-6 w-full max-w-md space-y-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="비밀번호 변경">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" />
              <h3 className="font-black">비밀번호 변경</h3>
            </div>
            <p className="text-xs text-muted-foreground">변경 즉시 반영됩니다 (재배포 불필요). 환경변수 ADMIN_PASSWORD는 긴급 복구용으로 유지됩니다.</p>
            <div className="space-y-3">
              <div><label className="label">현재 비밀번호</label><input type="password" className="input" value={pw.cur} onChange={(e) => setPw({ ...pw, cur: e.target.value })} autoFocus /></div>
              <div><label className="label">새 비밀번호 (8자 이상)</label><input type="password" className="input" value={pw.next} onChange={(e) => setPw({ ...pw, next: e.target.value })} /></div>
              <div><label className="label">새 비밀번호 확인</label><input type="password" className="input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} /></div>
            </div>
            {pwMsg && <p className={`text-xs font-bold ${pwOk ? "text-success" : "text-danger"}`}>{pwMsg}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className="btn-primary !py-2.5 text-sm" disabled={pwBusy || !pw.cur || !pw.next}
                onClick={async () => {
                  if (pw.next !== pw.confirm) { setPwOk(false); setPwMsg("새 비밀번호가 일치하지 않습니다."); return; }
                  setPwBusy(true); setPwMsg("");
                  try {
                    const res = await fetch("/api/admin/change-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: pw.cur, next: pw.next }) });
                    const d = await res.json();
                    if (!res.ok) throw new Error(d.error || "변경 실패");
                    setPwOk(true); setPwMsg("✓ 비밀번호가 변경되었습니다");
                    setTimeout(() => { setPwOpen(false); setPwMsg(""); setPw({ cur: "", next: "", confirm: "" }); }, 1200);
                  } catch (e) { setPwOk(false); setPwMsg(e instanceof Error ? e.message : "변경 중 오류가 발생했습니다."); }
                  finally { setPwBusy(false); }
                }}>
                {pwBusy ? "저장 중…" : "변경"}
              </button>
              <button type="button" className="btn-soft !py-2.5 text-sm" onClick={() => { setPwOpen(false); setPwMsg(""); setPw({ cur: "", next: "", confirm: "" }); }}>취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

