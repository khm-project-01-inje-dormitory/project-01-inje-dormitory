import { NextResponse } from "next/server";

// 설정·예약 현황은 실시간 변하므로 빌드 시점 정적 고정 금지 (매 요청 최신 값 응답)
export const dynamic = "force-dynamic";

/** 웹푸시 구독에 필요한 VAPID 공개키 */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
}
