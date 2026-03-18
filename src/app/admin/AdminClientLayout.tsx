"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const NAV_LINKS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/escorts", label: "Escorts" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/gallery", label: "Gallery" },
  { href: "/admin/premium-requests", label: "Premium requests" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/blocks", label: "Blocks" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/credits", label: "Add credits" },
  { href: "/admin/notes", label: "Notes" },
];

export default function AdminClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLoginPage = pathname === "/admin/login";

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  useEffect(() => {
    closeSidebar();
  }, [pathname, closeSidebar]);

  useEffect(() => {
    if (!token && !isLoginPage) {
      router.push("/admin/login");
      return;
    }
    if (token && user && user.role !== "admin" && !isLoginPage) {
      router.push("/");
      return;
    }
  }, [token, user, isLoginPage, router]);

  if (!token && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-silver)]">
        Redirecting...
      </div>
    );
  }

  if (token && user?.role !== "admin" && !isLoginPage) {
    return (
      <div className="min-h-screen flex items-center justify-center text-[var(--color-silver)]">
        Access denied.
      </div>
    );
  }

  if (isLoginPage) {
    return <>{children}</>;
  }

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen bg-[var(--color-obsidian)]">
      <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-[var(--color-obsidian)]/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin/escorts"
            className="text-lg font-medium tracking-wide text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)]"
          >
            Admin
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-5">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition ${
                  isActive(link.href)
                    ? "text-[var(--color-champagne)]"
                    : "text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <span className="text-sm text-[var(--color-muted)] truncate max-w-[140px]">
              {user?.email}
            </span>
            <Link
              href="/"
              className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
            >
              ← Site
            </Link>
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
        </div>
      </header>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={closeSidebar}
          />
          <aside className="absolute top-0 right-0 h-full w-72 max-w-[80vw] bg-[var(--color-obsidian)] border-l border-[var(--color-border)] shadow-2xl flex flex-col animate-slide-in-right">
            <div className="flex items-center justify-between h-14 px-5 border-b border-[var(--color-border)]">
              <span className="text-sm font-medium tracking-wide text-[var(--color-champagne)]">
                Admin menu
              </span>
              <button
                onClick={closeSidebar}
                className="p-2 text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
                aria-label="Close menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`block px-3 py-3 rounded-sm text-sm transition ${
                    isActive(link.href)
                      ? "text-[var(--color-champagne)] bg-[var(--color-champagne)]/10"
                      : "text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:bg-[var(--color-charcoal)]"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-[var(--color-border)] px-5 py-4 space-y-3">
              <p className="text-xs text-[var(--color-muted)] truncate">
                {user?.email}
              </p>
              <Link
                href="/"
                className="block text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
              >
                ← Back to site
              </Link>
            </div>
          </aside>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}

