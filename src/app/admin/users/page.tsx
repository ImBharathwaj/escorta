"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type User = {
  id: string;
  email: string | null;
  displayName: string | null;
  role: string;
  isBanned: boolean;
  isActive: boolean;
  createdAt: string;
  _count: { bookingsAsClient: number };
};

export default function AdminUsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [bannedOnly, setBannedOnly] = useState(false);
  const [role, setRole] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = useCallback(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (bannedOnly) params.set("banned", "1");
    else params.set("banned", "0");
    if (role) params.set("role", role);
    fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setUsers([]))
      .finally(() => setLoading(false));
  }, [token, q, bannedOnly, role]);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    const t = setTimeout(fetchUsers, 300);
    return () => clearTimeout(t);
  }, [token, fetchUsers]);

  async function setBanned(userId: string, isBanned: boolean) {
    if (!token) return;
    setUpdatingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isBanned, isActive: isBanned ? false : true }),
      });
      if (res.ok) fetchUsers();
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <Link href="/admin" className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block">
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">Users</h1>
      <p className="text-sm text-[var(--color-silver)] mb-6">
        Search and filter users. View and manage bans.
      </p>

      <div className="flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by email, name, or ID"
          className="px-3 py-2 bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded text-[var(--color-ivory)] text-sm min-w-[200px]"
        />
        <label className="flex items-center gap-2 text-sm text-[var(--color-silver)]">
          <input
            type="checkbox"
            checked={bannedOnly}
            onChange={(e) => setBannedOnly(e.target.checked)}
            className="rounded"
          />
          Banned only
        </label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 bg-[var(--color-charcoal)] border border-[var(--color-border)] rounded text-[var(--color-ivory)] text-sm"
        >
          <option value="">All roles</option>
          <option value="client">Client</option>
          <option value="escort">Escort</option>
          <option value="admin">Admin</option>
        </select>
        <button
          type="button"
          onClick={() => { setLoading(true); fetchUsers(); }}
          className="px-3 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-charcoal)] rounded"
        >
          Search
        </button>
      </div>

      {loading && <p className="text-[var(--color-silver)] text-sm">Loading…</p>}
      {!loading && (
        <>
          {users.length === 0 ? (
            <p className="text-[var(--color-silver)]">No users match.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded flex flex-wrap items-center justify-between gap-2"
                >
                  <div>
                    <p className="text-[var(--color-ivory)] font-light">
                      {u.displayName || u.email || u.id}
                      {u.isBanned && (
                        <span className="ml-2 text-xs text-red-400 font-medium">Banned</span>
                      )}
                    </p>
                    <p className="text-xs text-[var(--color-muted)]">
                      {u.email} · {u.role} · {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {u.isBanned ? (
                      <button
                        type="button"
                        disabled={updatingId === u.id}
                        onClick={() => setBanned(u.id, false)}
                        className="px-2 py-1 text-xs rounded border border-green-500/50 text-green-300 hover:bg-green-500/10 disabled:opacity-50"
                      >
                        {updatingId === u.id ? "Updating…" : "Unban"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={updatingId === u.id}
                        onClick={() => setBanned(u.id, true)}
                        className="px-2 py-1 text-xs rounded border border-red-500/50 text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                      >
                        {updatingId === u.id ? "Updating…" : "Ban"}
                      </button>
                    )}
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
