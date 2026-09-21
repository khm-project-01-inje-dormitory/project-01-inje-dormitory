import { NextResponse } from "next/server";

/** 웹푸시 구독에 필요한 VAPID 공개키 */
export async function GET() {
  return NextResponse.json({ publicKey: process.env.VAPID_PUBLIC_KEY || "" });
}
