"use client";

import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import { ChevronDown, LogOut, Settings, Shield, User as UserIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export function UserNav({ user }: { user: User | null }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (!user) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login" className="btn btn-secondary py-2 px-4">
          Sign in
        </Link>
        <Link href="/signup" className="btn btn-primary py-2 px-4">
          Sign up
        </Link>
      </div>
    );
  }

  const avatarUrl = user.user_metadata?.avatar_url;
  const name = user.user_metadata?.full_name || user.email?.split("@")[0];

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 p-1 hover:bg-bg-hover rounded-lg transition-colors"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div className="avatar w-8 h-8" />
        )}
        <ChevronDown className="w-4 h-4 text-text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-bg-card rounded-xl border border-border-subtle shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-border-subtle">
            <p className="text-sm font-medium text-text-primary truncate">{name}</p>
            <p className="text-xs text-text-muted truncate">{user.email}</p>
          </div>
          <div className="p-1">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
              onClick={() => setOpen(false)}
            >
              <UserIcon className="w-4 h-4" />
              Profile
            </Link>
            <Link
              href="/settings"
              className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
              onClick={() => setOpen(false)}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
            <Link
              href="/admin"
              className="flex items-center gap-3 px-3 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded-lg transition-colors"
              onClick={() => setOpen(false)}
            >
              <Shield className="w-4 h-4" />
              Admin
            </Link>
          </div>
          <div className="p-1 border-t border-border-subtle">
            <button
              type="button"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm text-error-400 hover:bg-error-500/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
