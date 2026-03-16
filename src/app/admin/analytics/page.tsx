"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Analytics = {
  credits: { totalTransactions: number; totalEarned: number; totalSpent: number };
  sessions: { liveSessions: number; videoCalls: number };
  reports: { sessionReports: number };
};

export default function AdminAnalyticsPage() {
  const { token } = useAuth();
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/analytics", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load analytics."))
      .finally(() => setLoading(false));
  }, [token]);

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-6">Analytics</h1>

      {loading && <p className="text-[var(--color-silver)]">Loading…</p>}
      {error && <p className="text-red-300/90 text-sm">{error}</p>}
      {!loading && !error && data && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <div className="p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">Credits (platform)</p>
            <p className="text-[var(--color-ivory)] font-light">
              Total earned: <span className="text-[var(--color-champagne)]">{data.credits.totalEarned}</span>
            </p>
            <p className="text-[var(--color-ivory)] font-light">
              Total spent: <span className="text-red-300/90">{data.credits.totalSpent}</span>
            </p>
            <p className="text-sm text-[var(--color-silver)] mt-2">{data.credits.totalTransactions} transactions</p>
          </div>
          <div className="p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">Sessions</p>
            <p className="text-[var(--color-ivory)] font-light">Live sessions (all time): {data.sessions.liveSessions}</p>
            <p className="text-[var(--color-ivory)] font-light">Video calls (all time): {data.sessions.videoCalls}</p>
          </div>
          <div className="p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
            <p className="text-xs text-[var(--color-muted)] uppercase tracking-wider mb-1">Reports</p>
            <p className="text-[var(--color-ivory)] font-light">Session reports: {data.reports.sessionReports}</p>
            <Link href="/admin/reports" className="text-sm text-[var(--color-champagne)] hover:underline mt-2 inline-block">
              View reports →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
