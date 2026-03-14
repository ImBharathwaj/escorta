"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function EmailVerificationBanner() {
  const { user, token } = useAuth();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);

  const show =
    user &&
    user.email &&
    !user.emailVerifiedAt &&
    !dismissed;

  if (!show) return null;

  async function handleResend() {
    if (!token || sending) return;
    setSending(true);
    setDevLink(null);
    try {
      const res = await fetch("/api/auth/send-verification-email", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setSent(true);
        if (data.verificationUrl) setDevLink(data.verificationUrl);
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="bg-[var(--color-champagne)]/15 border-b border-[var(--color-champagne)]/40 px-4 py-2 flex flex-wrap items-center justify-center gap-2 text-sm">
      <span className="text-[var(--color-ivory)] font-light">
        Please verify your email to get the most out of your account.
      </span>
      {devLink ? (
        <a
          href={devLink}
          className="underline text-[var(--color-champagne)] hover:opacity-90"
        >
          Verify now (dev)
        </a>
      ) : (
        <button
          type="button"
          onClick={handleResend}
          disabled={sending || sent}
          className="underline text-[var(--color-champagne)] hover:opacity-90 disabled:opacity-60"
        >
          {sending ? "Sending…" : sent ? "Check your inbox" : "Resend verification email"}
        </button>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="text-[var(--color-muted)] hover:text-[var(--color-silver)] ml-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}
