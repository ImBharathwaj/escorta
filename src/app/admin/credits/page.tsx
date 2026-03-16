"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

type AddCreditsResult = {
  ok: boolean;
  userId: string;
  email: string | null;
  displayName: string | null;
  previousCredits: number;
  added: number;
  newCredits: number;
};

export default function AdminCreditsPage() {
  const { token } = useAuth();
  const [userIdentifier, setUserIdentifier] = useState("");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<AddCreditsResult | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);
    const amt = Math.floor(Number(amount));
    if (!userIdentifier.trim()) {
      setError("Enter user email or user ID.");
      return;
    }
    if (!(amt >= 1)) {
      setError("Amount must be at least 1.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/add-credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userIdentifier: userIdentifier.trim(),
          amount: amt,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to add credits.");
        return;
      }
      setResult(data);
      setUserIdentifier("");
      setAmount("");
    } catch {
      setError("Request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <Link
        href="/admin"
        className="text-sm text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-6 inline-block"
      >
        ← Admin
      </Link>
      <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">
        Add credits to user
      </h1>
      <p className="text-sm text-[var(--color-silver)] mb-6">
        Add credits to any user by email or user ID (for testing).
      </p>

      <form
        onSubmit={handleSubmit}
        className="max-w-md space-y-4 p-5 border border-[var(--color-border)] bg-[var(--color-charcoal)] rounded"
      >
        <div>
          <label
            htmlFor="userIdentifier"
            className="block text-sm text-[var(--color-silver)] mb-1"
          >
            User (email or user ID)
          </label>
          <input
            id="userIdentifier"
            type="text"
            value={userIdentifier}
            onChange={(e) => setUserIdentifier(e.target.value)}
            placeholder="user@example.com or uuid"
            className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
          />
        </div>
        <div>
          <label
            htmlFor="amount"
            className="block text-sm text-[var(--color-silver)] mb-1"
          >
            Credits to add
          </label>
          <input
            id="amount"
            type="number"
            min={1}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 100"
            className="w-full px-3 py-2 bg-[var(--color-obsidian)] border border-[var(--color-border)] text-[var(--color-ivory)] text-sm rounded focus:border-[var(--color-champagne)]/50"
          />
        </div>
        {error && (
          <p className="text-sm text-red-300/90">{error}</p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="px-4 py-2 text-sm font-medium border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50"
        >
          {submitting ? "Adding…" : "Add credits"}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-5 border border-[var(--color-champagne)]/40 bg-[var(--color-charcoal)] rounded max-w-md">
          <p className="text-sm font-medium text-[var(--color-champagne)] mb-2">
            Credits added
          </p>
          <p className="text-sm text-[var(--color-ivory)]">
            {result.displayName || result.email || result.userId} — previous:{" "}
            <span className="text-[var(--color-silver)]">{result.previousCredits}</span>
            {" "}+{" "}
            <span className="text-[var(--color-champagne)]">{result.added}</span>
            {" "}= <span className="text-[var(--color-champagne)]">{result.newCredits}</span> credits
          </p>
        </div>
      )}
    </div>
  );
}
