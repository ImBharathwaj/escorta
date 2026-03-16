"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type BlockRow = {
  blocker: { id: string; email: string | null; displayName: string | null; role: string };
  blocked: { id: string; email: string | null; displayName: string | null; role: string };
  createdAt: string;
};

export default function AdminBlocksPage() {
  const { token } = useAuth();
  const [rows, setRows] = useState<BlockRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!token) return;
    fetch("/api/admin/blocks", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (!r.ok) throw new Error("Failed");
        return r.json();
      })
      .then((d) => setRows(Array.isArray(d.blocks) ? d.blocks : []))
      .catch(() => setError("Could not load blocks."))
      .finally(() => setLoading(false));
  }, [token]);

  function formatUser(u: BlockRow["blocker"]) {
    return u.displayName || u.email || u.id;
  }

  function formatDate(s: string) {
    return new Date(s).toLocaleString();
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-6">User blocks</h1>

      {loading && <p className="text-[var(--color-silver)]">Loading…</p>}
      {error && <p className="text-red-300/90 text-sm">{error}</p>}

      {!loading && !error && (
        <>
          {rows.length === 0 ? (
            <p className="text-[var(--color-silver)]">No blocks yet.</p>
          ) : (
            <ul className="space-y-3">
              {rows.map((b, idx) => (
                <li
                  key={`${b.blocker.id}-${b.blocked.id}-${idx}`}
                  className="p-3 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded text-sm flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-[var(--color-ivory)]">
                      <span className="text-[var(--color-champagne)]">{formatUser(b.blocker)}</span> ({b.blocker.role}){" "}
                      blocked{" "}
                      <span className="text-[var(--color-champagne)]">{formatUser(b.blocked)}</span> ({b.blocked.role})
                    </p>
                    <p className="text-[0.7rem] text-[var(--color-muted)] mt-1">{formatDate(b.createdAt)}</p>
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

