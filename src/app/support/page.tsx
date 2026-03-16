"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

const inputStyles =
  "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

export default function SupportPage() {
  const { user, token } = useAuth();
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState("general");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess(false);
    if (message.trim().length < 10) {
      setError("Message must be at least 10 characters.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/support/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          email: email.trim() || undefined,
          category,
          message: message.trim(),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Failed to send message.");
        return;
      }
      setSuccess(true);
      setMessage("");
    } catch {
      setError("Request failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← Home
        </Link>
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          Support
        </p>
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Contact us
        </h1>
        <p className="text-[var(--color-silver)] font-light text-sm mb-10">
          Tell us what you need help with. If you’re signed in, we’ll attach your account context.
        </p>

        {user && (
          <div className="mb-8 p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)]/50 text-xs text-[var(--color-silver)]">
            Signed in as{" "}
            <span className="text-[var(--color-ivory)]">
              {user.displayName || user.email || user.id}
            </span>
            .
          </div>
        )}

        <form onSubmit={submit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
              {error}
            </div>
          )}
          {success && (
            <div className="p-3 text-sm text-green-200 border border-green-500/30 bg-green-500/10">
              Message sent. We’ll get back to you.
            </div>
          )}

          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Email (optional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputStyles}
            />
          </div>

          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputStyles}
            >
              <option value="general">General</option>
              <option value="account">Account</option>
              <option value="payments">Payments</option>
              <option value="safety">Safety</option>
              <option value="bug">Bug report</option>
              <option value="gallery">Gallery / SEO</option>
              <option value="live-video">Live / Video</option>
            </select>
          </div>

          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Message
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Describe the issue and include steps to reproduce if it’s a bug."
              className={`${inputStyles} resize-none`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
          >
            {loading ? "Sending..." : "Send message"}
          </button>
        </form>
      </div>
    </div>
  );
}

