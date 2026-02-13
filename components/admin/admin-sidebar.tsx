"use client";

import { LayoutDashboard, FileImage, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/posts", label: "Posts", icon: FileImage },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-bg-elevated border-r border-border-subtle flex flex-col z-50">
      {/* Logo */}
      <div className="h-16 flex items-center px-6 border-b border-border-subtle">
        <Link href="/admin" className="text-lg font-bold text-text-primary tracking-tight">
          LEMME<span className="text-primary-500">.</span>ADMIN
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-500/10 text-primary-400"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to site */}
      <div className="px-3 py-4 border-t border-border-subtle">
        <Link
          href="/"
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors"
        >
          <LogOut className="w-5 h-5" />
          Back to site
        </Link>
      </div>
    </aside>
  );
}
