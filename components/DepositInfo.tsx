"use client";

import { useState } from "react";
import { Check, Copy, Link2, MessageCircle } from "lucide-react";

/**
 * 입금 안내 카드 — 계좌 복사 + 카카오페이/토스 앱 연동
 * 토스: 공식 송금 딥링크(supertoss://send)로 금액까지 미리 채움
 * 카카오페이: 개인 송금 딥링크가 없어 계좌 복사 후 앱을 열어주는 방식
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
      await navigator.clipboard.writeText(`${bank} ${account} ${holder}`);
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
        <div className="text-xl font-extrabold tracking-tight">
          {bank} <span className="tabular-nums">{account}</span>
        </div>
        <div className="text-sm text-muted-foreground mt-0.5">예금주 {holder}</div>
      </div>
      <div className="flex items-center justify-between rounded-xl border border-border px-4 py-3">
        <span className="text-sm font-semibold">입금하실 금액</span>
        <span className="text-lg font-extrabold text-primary tabular-nums">
          {amount.toLocaleString("ko-KR")}원
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button className="btn-outline" onClick={copyAccount}>
          {copied ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
          {copied ? "복사 완료!" : "계좌 복사"}
        </button>
        {/* 카카오페이: 복사 후 앱 오픈 */}
        <a
          className="btn w-full bg-[#ffe812] text-[#181600] hover:brightness-105"
          onClick={copyAccount}
          href="kakaopay://"
        >
          <MessageCircle className="w-4 h-4" />
          카카오페이로 송금
        </a>
        {/* 토스: 딥링크로 은행/계좌/금액 미리 채움 */}
        <a className="btn w-full bg-[#3182f6] text-white hover:brightness-110" href={tossLink}>
          <Link2 className="w-4 h-4" />
          토스로 송금
        </a>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">
        카카오페이·토스 버튼은 스마트폰에서 해당 앱이 설치된 경우 바로 연결됩니다.
        앱이 열리지 않으면 <b>계좌 복사</b> 후 카카오페이·토스 앱에서 붙여넣어 송금해 주세요.
        입금자명이 다르면 입금 확인이 지연될 수 있으니 위 입력하신 입금자명으로 보내주세요.
      </p>
    </div>
  );
}
