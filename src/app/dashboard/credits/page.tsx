"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type Transaction = {
  id: string;
  amount: number;
  type: string;
  label: string;
  withWhom: string | null;
  referenceType: string | null;
  referenceId: string | null;
  createdAt: string;
};

type HistoryResponse = {
  transactions: Transaction[];
  summary: { spent: number; earned: number };
};

function formatDate(s: string) {
  const d = new Date(s);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function CreditsPage() {
  const { user, token, authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authReady || !token) return;
    fetch("/api/credits/history", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setData)
      .catch(() => setError("Could not load history."))
      .finally(() => setLoading(false));
  }, [authReady, token]);

  const isClient = user?.role === "client";

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← Dashboard
        </Link>
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          {isClient ? "Credit usage" : "Credits earned"}
        </p>
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
          {isClient ? "Your credit history" : "Your earnings"}
        </h1>
        <p className="text-[var(--color-silver)] font-light text-sm mb-10">
          {isClient
            ? "When and where you spent credits: connection requests, chat messages, and Sexter sessions."
            : "When and how you earned credits from Sexter sessions with clients."}
        </p>

        {loading && (
          <p className="text-[var(--color-silver)] font-light">Loading…</p>
        )}
        {error && (
          <p className="text-red-300/90 text-sm">{error}</p>
        )}
        {!loading && !error && data && (
          <>
            <div className="mb-8 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
              {isClient ? (
                <p className="text-[var(--color-ivory)] font-light">
                  Total credits spent: <span className="text-[var(--color-champagne)]">{data.summary.spent}</span>
                </p>
              ) : (
                <p className="text-[var(--color-ivory)] font-light">
                  Total credits earned: <span className="text-[var(--color-champagne)]">{data.summary.earned}</span>
                </p>
              )}
            </div>

            {data.transactions.length === 0 ? (
              <p className="text-[var(--color-silver)] font-light">
                {isClient ? "No credit usage yet." : "No earnings yet."}
              </p>
            ) : (
              <ul className="space-y-3">
                {data.transactions.map((t) => (
                  <li
                    key={t.id}
                    className="p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <p className="text-[var(--color-ivory)] font-light">
                        {t.label}
                        {t.withWhom && (
                          <span className="text-[var(--color-silver)] font-normal">
                            {" "}
                            {isClient ? "with" : "from"}{" "}
                            <span className="text-[var(--color-champagne)]/90">{t.withWhom}</span>
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-[var(--color-muted)] mt-0.5">
                        {formatDate(t.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      {t.amount > 0 ? (
                        <span className="text-[var(--color-champagne)] font-light">+{t.amount}</span>
                      ) : (
                        <span className="text-red-300/90 font-light">{t.amount}</span>
                      )}
                      <span className="text-[var(--color-silver)] text-sm ml-1">
                        credit{t.amount !== 1 && t.amount !== -1 ? "s" : ""}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
