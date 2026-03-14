"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification link.");
      return;
    }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (r.ok) {
          setStatus("success");
          setMessage(data.message || "Your email is verified.");
          refreshUser();
        } else {
          setStatus("error");
          setMessage(data.error || "Verification failed.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong.");
      });
  }, [token, refreshUser]);

  return (
    <div className="pt-24 min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        {status === "loading" && (
          <p className="text-[var(--color-silver)] font-light">Verifying your email…</p>
        )}
        {status === "success" && (
          <>
            <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">Email verified</h1>
            <p className="text-[var(--color-silver)] font-light mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)]/10 transition"
            >
              Go to dashboard
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-light text-[var(--color-ivory)] mb-2">Verification failed</h1>
            <p className="text-[var(--color-silver)] font-light mb-6">{message}</p>
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
            >
              Go to dashboard
            </Link>
            <p className="mt-4 text-sm text-[var(--color-muted)]">
              You can request a new verification email from your account.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">Loading…</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
