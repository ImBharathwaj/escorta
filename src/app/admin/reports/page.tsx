"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Report = {
  id: string;
  reportType: string;
  referenceId: string;
  reason: string | null;
  createdAt: string;
  reporter: { id: string; email: string | null; displayName: string | null; role: string };
};

export default function AdminReportsPage() {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/reports", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((d) => setReports(Array.isArray(d.reports) ? d.reports : []))
      .catch(() => setError("Could not load reports."))
      .finally(() => setLoading(false));
  }, [token]);

  function formatDate(s: string) {
    return new Date(s).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  async function handleAction(id: string, action: "mark_resolved" | "ban_user", banUserId?: string) {
    if (!token) return;
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/admin/reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, banUserId }),
      });
      if (!res.ok) {
        throw new Error("Failed");
      }
      if (action === "mark_resolved") {
        setReports((prev) => prev.filter((r) => r.id !== id));
      } else {
        // keep report but you might want to mark it differently later
      }
    } catch {
      setError("Could not update report.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-6">Session reports</h1>

      {loading && <p className="text-[var(--color-silver)]">Loading…</p>}
      {error && <p className="text-red-300/90 text-sm">{error}</p>}
      {!loading && !error && (
        <>
          {reports.length === 0 ? (
            <p className="text-[var(--color-silver)]">No reports yet.</p>
          ) : (
            <ul className="space-y-4">
              {reports.map((r) => (
                <li key={r.id} className="p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[var(--color-ivory)] font-light">
                        <span className="text-[var(--color-champagne)]">{r.reportType}</span> — {r.referenceId.slice(0, 8)}…
                      </p>
                      <p className="text-sm text-[var(--color-silver)] mt-1">
                        Reported by {r.reporter.displayName || r.reporter.email || r.reporter.id} ({r.reporter.role})
                      </p>
                      {r.reason && (
                        <p className="text-sm text-[var(--color-silver)] mt-2 italic">&ldquo;{r.reason}&rdquo;</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="text-xs text-[var(--color-muted)]">{formatDate(r.createdAt)}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleAction(r.id, "mark_resolved")}
                          disabled={updatingId === r.id}
                          className="px-2 py-1 text-xs rounded border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] disabled:opacity-60"
                        >
                          Mark resolved
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(r.id, "ban_user", r.reporter.id)}
                          disabled={updatingId === r.id}
                          className="px-2 py-1 text-xs rounded border border-red-500/40 text-red-300 hover:bg-red-500/10 disabled:opacity-60"
                        >
                          Ban reporter
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
