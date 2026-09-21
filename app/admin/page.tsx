import { redirect } from "next/navigation";
import { isAdminLoggedIn } from "@/lib/auth";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  if (!(await isAdminLoggedIn())) redirect("/admin/login");
  return <AdminDashboard />;
}
