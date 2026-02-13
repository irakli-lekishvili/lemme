import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";

export const metadata = {
  title: "Admin - LEMME.LOVE",
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-bg-base">
      <AdminSidebar />
      <main className="ml-60">
        <header className="h-16 border-b border-border-subtle bg-bg-elevated flex items-center px-8">
          <h1 className="text-sm font-medium text-text-secondary">
            Admin Panel
          </h1>
        </header>
        <div className="p-8">{children}</div>
      </main>
    </div>
  );
}
