import AdminSidebar from "@/components/AdminSidebar";
import AdminGuard from "@/components/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-cream/40">
        <AdminSidebar />
        <div className="flex-1 overflow-x-hidden p-8">{children}</div>
      </div>
    </AdminGuard>
  );
}
