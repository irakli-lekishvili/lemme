"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();

  const isActive = (href: string, prefixes?: string[]) => {
    if (href === "/") return pathname === "/";
    if (prefixes) return prefixes.some((p) => pathname.startsWith(p));
    return pathname.startsWith(href);
  };

  return (
    <>
      <Link
        href="/"
        className={`text-sm font-medium transition-colors hover:text-primary-400 ${
          isActive("/") ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        Discover
      </Link>
      <Link
        href="/collections"
        className={`text-sm font-medium transition-colors hover:text-primary-400 ${
          isActive("/collections", ["/collections", "/c/"]) ? "text-text-primary" : "text-text-secondary"
        }`}
      >
        Collections
      </Link>
    </>
  );
}
