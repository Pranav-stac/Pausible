import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-slate-500">Loading admin…</div>}>
      <AdminDashboard />
    </Suspense>
  );
}
