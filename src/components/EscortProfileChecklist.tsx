"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type ChecklistItem = {
  key: string;
  label: string;
  done: boolean;
};

export function EscortProfileChecklist({ token }: { token: string | null }) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetch("/api/escorts/me/completeness", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setItems(d.items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading || items.length === 0) return null;

  const doneCount = items.filter((i) => i.done).length;
  const total = items.length;
  const allDone = doneCount === total;
  const pct = Math.round((doneCount / total) * 100);

  if (allDone) return null;

  return (
    <div className="mb-10 p-6 border border-[var(--color-champagne)]/30 bg-[var(--color-champagne)]/5">
      <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-1">
        Complete your profile
      </h2>
      <p className="text-sm text-[var(--color-silver)] font-light mb-4">
        Finish these steps to become visible to members and receive connection requests.
      </p>

      <div className="w-full h-2 bg-[var(--color-charcoal)] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-[var(--color-champagne)] transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-[var(--color-muted)] mb-4">{doneCount} of {total} completed</p>

      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.key} className="flex items-center gap-3">
            <div
              className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 text-[10px] ${
                item.done
                  ? "border-green-400 bg-green-400/10 text-green-400"
                  : "border-[var(--color-border)] text-[var(--color-muted)]"
              }`}
            >
              {item.done ? "✓" : ""}
            </div>
            <span
              className={`text-sm ${
                item.done
                  ? "text-[var(--color-silver)] line-through"
                  : "text-[var(--color-ivory)]"
              }`}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/dashboard/profile"
        className="inline-block mt-5 px-5 py-2.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 transition"
      >
        Edit profile
      </Link>
    </div>
  );
}
