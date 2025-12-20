import { createClient } from "@/lib/supabase/server";
import { Bookmark, Search } from "lucide-react";
import Link from "next/link";
import { UserNav } from "../auth/user-nav";
import { ViewToggle } from "./view-toggle";

export async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 !bg-[#141414] border-b border-border-subtle">
      <div className="max-w-[1800px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-8">
          <Link
            href="/"
            className="text-xl font-bold text-text-primary tracking-tight"
          >
            LEMME<span className="text-primary-500">.</span>LOVE
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-medium text-text-primary hover:text-primary-400 transition-colors"
            >
              Discover
            </Link>
            <ViewToggle />
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-xl mx-8 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              type="text"
              placeholder="Try 'cyberpunk aesthetic' or 'ethereal portrait'"
              className="input !pl-12 py-2.5 bg-bg-elevated"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {user && (
            <>
              <Link href="/create" className="btn btn-outline py-2 px-4">
                Create
              </Link>
              <Link
                href="/bookmarks"
                className="p-2 hover:bg-bg-hover rounded-lg transition-colors"
              >
                <Bookmark className="w-5 h-5 text-text-secondary" />
              </Link>
            </>
          )}
          <UserNav user={user} />
        </div>
      </div>
    </nav>
  );
}
