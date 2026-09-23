"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

/**
 * 입금 안내 카드 — 계좌 복사 + 토스 송금 연동
 * 토스: 공식 송금 딥링크(supertoss://send)로 은행·계좌·금액까지 미리 채움
 * (카카오페이는 개인 계좌 송금 딥링크가 공식 제공되지 않아 오류 이슈 → 제거, 2026-09)
 */
export default function DepositInfo({
  bank,
  account,
  holder,
  amount,
}: {
  bank: string;
  account: string;
  holder: string;
  amount: number;
}) {
  const [copied, setCopied] = useState(false);

  const accountNo = account.replace(/-/g, "");
  const tossLink = `supertoss://send?bank=${encodeURIComponent(bank)}&accountNo=${accountNo}&amount=${amount}`;

  async function copyAccount() {
    try {
      // 금융앱 붙여넣기를 위해 계좌번호만 복사 (은행·예금주 제외)
      await navigator.clipboard.writeText(account);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 권한 없음 */
    }
  }

  return (
    <div className="card-surface p-5 sm:p-6 space-y-4">
      <div className="text-sm font-bold text-muted-foreground">입금 계좌</div>
      <div className="rounded-xl bg-primary-soft border border-primary/10 px-4 py-4">
        <div className="text-sm font-bold">{bank}({holder})</div>
        <div className="text-2xl font-extrabold tabular-nums tracking-tight mt-1 break-all">{account}</div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <span className="text-sm font-semibold">입금하실 금액</span>
        <span className="text-lg font-extrabold text-primary tabular-nums">
          {amount.toLocaleString("ko-KR")}원
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <button className="btn-outline" onClick={copyAccount}>
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          {copied ? "복사 완료!" : "계좌 복사"}
        </button>
        {/* 토스: 딥링크로 은행/계좌/금액 미리 채움 */}
        {/* 토스 브랜드 고정색 — 디자인 토큰 예외 (브랜드 가이드) */}
        <a className="btn w-full bg-[#3182f6] text-white hover:brightness-110" href={tossLink}>
          <Link2 className="w-4 h-4" />
          토스로 송금
        </a>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        토스 버튼은 스마트폰에서 토스 앱이 설치된 경우 은행·계좌·금액이 채워진 송금 화면으로 바로 연결됩니다.
        앱이 열리지 않으면 <b>계좌 복사</b> 후 토스 앱에서 붙여넣어 송금해 주세요.
        입금자명이 다르면 입금 확인이 지연될 수 있으니 위 입력하신 입금자명으로 보내주세요.
      </p>
    </div>
  );
}