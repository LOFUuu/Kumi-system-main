import AdminSidebar from "@/components/AdminSidebar";
import AdminGuard from "@/components/AdminGuard";
import AdminHeader from "@/components/AdminHeader";
import { AdminNavProvider } from "@/components/AdminNavContext";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <AdminNavProvider>
        <div className="flex min-h-screen bg-cream/40">
          <AdminSidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <AdminHeader />
            <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">{children}</main>
          </div>
        </div>
      </AdminNavProvider>
    </AdminGuard>
  );
}
