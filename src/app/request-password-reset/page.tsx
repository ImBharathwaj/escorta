"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const inputStyles =
  "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

function RequestResetContent() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!email.trim()) {
      setError("Email is required.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-password-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Request failed.");
        return;
      }
      setSuccess(data.message || "If your email exists, a reset link has been sent.");
      setTimeout(() => router.push("/login"), 1500);
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-24 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-md">
        <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-2">
          Account
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-2">
          Forgot password
        </h1>
        <p className="text-[var(--color-silver)] font-light text-sm mb-8">
          Enter your email address and we’ll send a reset link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-200 border border-green-500/30 bg-green-500/10">
              {success}
            </div>
          )}
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyles}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <p className="mt-8 text-[var(--color-silver)] font-light text-sm">
          <Link
            href="/login"
            className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RequestPasswordResetPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">
          Loading...
        </div>
      }
    >
      <RequestResetContent />
    </Suspense>
  );
}

