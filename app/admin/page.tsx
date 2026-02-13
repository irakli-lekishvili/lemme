import { createServiceClient } from "@/lib/supabase/service";
import { FileImage, Users, Flag } from "lucide-react";
import Link from "next/link";

export default async function AdminDashboard() {
  const service = createServiceClient();

  const [
    { count: postsCount },
    { count: reportsCount },
  ] = await Promise.all([
    service.from("posts").select("*", { count: "exact", head: true }),
    service
      .from("reports")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending"),
  ]);

  const stats = [
    {
      label: "Total Posts",
      value: postsCount ?? 0,
      icon: FileImage,
      href: "/admin/posts",
    },
    {
      label: "Pending Reports",
      value: reportsCount ?? 0,
      icon: Flag,
      href: "/admin",
    },
  ];

  return (
    <div>
      <h2 className="text-2xl font-bold text-text-primary mb-6">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-bg-card border border-border-subtle rounded-xl p-6 hover:border-border-strong transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary-500/10">
                <stat.icon className="w-6 h-6 text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-text-muted">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary">
                  {stat.value}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
