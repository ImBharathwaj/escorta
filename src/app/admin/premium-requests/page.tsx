"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

type PremiumRequest = {
  id: string;
  escortId: string;
  escortName: string;
  escortEmail: string | null;
  isPremium: boolean;
  status: string;
  message: string | null;
  adminNotes: string | null;
  createdAt: string;
  reviewedAt: string | null;
};

export default function AdminPremiumRequestsPage() {
  const { token } = useAuth();
  const [requests, setRequests] = useState<PremiumRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const fetchRequests = () => {
    if (!token) return;
    fetch("/api/admin/premium-requests", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setRequests(data.requests || []))
      .catch(() => setRequests([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  async function review(id: string, action: "approve" | "reject") {
    if (!token) return;
    setUpdating(id);
    try {
      const res = await fetch(`/api/admin/premium-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, adminNotes: notes[id] || undefined }),
      });
      if (res.ok) fetchRequests();
    } finally {
      setUpdating(null);
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-[var(--color-silver)] font-light">
        Loading...
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");

  return (
    <div>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] tracking-wide mb-2">
        Premium requests
      </h1>
      <p className="text-sm text-[var(--color-silver)] mb-8">
        Companions request premium to upload videos for live stream. Grant or decline below.
      </p>

      {pending.length === 0 && requests.length === 0 ? (
        <div className="py-16 text-center text-[var(--color-silver)] font-light">
          No premium requests yet.
        </div>
      ) : (
        <div className="space-y-4">
          {pending.length > 0 && (
            <h2 className="text-sm font-medium text-[var(--color-champagne)] uppercase tracking-wider">
              Pending ({pending.length})
            </h2>
          )}
          {requests.map((r) => (
            <div
              key={r.id}
              className={`p-6 border bg-[var(--color-charcoal)] ${
                r.status === "pending"
                  ? "border-[var(--color-champagne)]/40"
                  : "border-[var(--color-border)]"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-light text-[var(--color-ivory)]">
                    {r.escortName}
                  </h2>
                  <p className="text-sm text-[var(--color-silver)] mt-1">
                    {r.escortEmail ?? "—"} · {r.status}
                    {r.isPremium && " · Premium ✓"}
                  </p>
                  {r.message && (
                    <p className="text-sm text-[var(--color-muted)] mt-2 italic">
                      &ldquo;{r.message}&rdquo;
                    </p>
                  )}
                  <p className="text-xs text-[var(--color-muted)] mt-2">
                    Requested {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.status !== "pending" && r.adminNotes && (
                    <p className="text-xs text-[var(--color-muted)] mt-1">
                      Your note: {r.adminNotes}
                    </p>
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="space-y-2 min-w-[200px]">
                    <textarea
                      placeholder="Note (optional)"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      rows={2}
                      className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => review(r.id, "approve")}
                        disabled={updating === r.id}
                        className="flex-1 px-4 py-2 text-sm bg-[var(--color-champagne)] text-[var(--color-obsidian)] hover:opacity-90 disabled:opacity-50 transition"
                      >
                        {updating === r.id ? "…" : "Approve"}
                      </button>
                      <button
                        onClick={() => review(r.id, "reject")}
                        disabled={updating === r.id}
                        className="flex-1 px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-obsidian)] disabled:opacity-50 transition"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
