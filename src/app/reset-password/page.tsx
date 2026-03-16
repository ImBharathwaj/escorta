"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

const inputStyles =
  "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setError("");
    setSuccess("");
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!token) {
      setError("Missing reset token.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Reset failed.");
        return;
      }
      setSuccess("Password updated. Please sign in.");
      setTimeout(() => router.push("/login"), 1200);
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
          Reset password
        </h1>
        <p className="text-[var(--color-silver)] font-light text-sm mb-8">
          Choose a new password for your account.
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
              New password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              minLength={8}
              required
            />
          </div>
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Confirm password
            </label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={inputStyles}
              minLength={8}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">
          Loading...
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}

