import { redirect } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";
import { MODE_LABEL } from "@/lib/mode";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminLoggedIn())) redirect("/admin/login");
  // 모드 표시는 서버에서 계산 (환경변수를 실제로 볼 수 있는 곳이 서버뿐)
  return <AdminDashboard modeLabel={MODE_LABEL} />;
}
