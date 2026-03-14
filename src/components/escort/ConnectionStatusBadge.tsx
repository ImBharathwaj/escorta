"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export function ConnectionStatusBadge({ escortId }: { escortId: string }) {
  const { user, token } = useAuth();
  const [status, setStatus] = useState<"accepted" | "pending" | null>(null);
  const [connectionId, setConnectionId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "client") return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const conn = (data.bookings || []).find(
          (b: { escort?: { id: string }; escortId?: string }) =>
            (b.escort?.id || b.escortId) === escortId
        );
        if (conn) {
          setStatus(conn.status === "accepted" ? "accepted" : conn.status === "pending" ? "pending" : null);
          if (conn.status === "accepted") setConnectionId(conn.id);
        }
      })
      .catch(() => {});
  }, [token, user?.role, escortId]);

  if (!status) return null;

  return (
    <span
      className={`text-xs tracking-[0.2em] uppercase border px-2 py-1 rounded-sm inline-flex items-center gap-2 ${
        status === "accepted"
          ? "text-[var(--color-champagne)] border-[var(--color-champagne)]"
          : "text-[var(--color-silver)] border-[var(--color-border)]"
      }`}
    >
      {status === "accepted" ? (
        <>
          Connected
          {connectionId && (
            <Link
              href={`/connections/${connectionId}`}
              className="hover:text-[var(--color-champagne-light)] transition underline underline-offset-2"
            >
              Chat
            </Link>
          )}
        </>
      ) : (
        "Connection requested"
      )}
    </span>
  );
}
