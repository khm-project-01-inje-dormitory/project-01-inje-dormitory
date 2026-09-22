import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { isAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

/** 관리자: 감사로그 최근 N건 */
export async function GET(req: Request) {
  if (!isAdmin(req)) return NextResponse.json({ error: "권한 없음" }, { status: 401 });
  const limit = Math.min(Number(new URL(req.url).searchParams.get("limit") || 50), 200);
  return NextResponse.json({ logs: await store.listAuditLogs(limit) });
}
