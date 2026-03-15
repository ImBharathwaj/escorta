"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, token } = useAuth();

  const isLoginPage = pathname === "/admin/login";

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

  return (
    <div className="min-h-screen bg-[var(--color-obsidian)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-obsidian)]/95">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href="/admin/escorts"
            className="text-lg font-medium tracking-wide text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)]"
          >
            Admin
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/admin/escorts"
              className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
            >
              Escorts
            </Link>
            <Link
              href="/admin/premium-requests"
              className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
            >
              Premium requests
            </Link>
            <span className="text-sm text-[var(--color-muted)]">{user?.email}</span>
            <Link
              href="/"
              className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)]"
            >
              ← Site
            </Link>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
