"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const SESSION_KEY = "escorta_signup_promo_dismissed";

export function SignupPromoPopup() {
  const router = useRouter();
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;
    if (user) {
      setShow(false);
      return;
    }
    const dismissed = sessionStorage.getItem(SESSION_KEY);
    if (dismissed === "true") {
      setShow(false);
      return;
    }
    const t = setTimeout(() => {
      // Only show if age gate has been passed and user is still not logged in
      const ageVerified = localStorage.getItem("escorta_age_verified");
      if (!user && ageVerified === "true") {
        setShow(true);
      }
    }, 10000);
    return () => clearTimeout(t);
  }, [mounted, user]);

  function handleDismiss() {
    sessionStorage.setItem(SESSION_KEY, "true");
    setShow(false);
  }

  function handleSignup() {
    setShow(false);
    router.push("/register");
  }

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-md border border-[var(--color-champagne)]/40 bg-[var(--color-obsidian)] rounded-sm shadow-xl p-8">
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
          aria-label="Close"
        >
          ×
        </button>
        <div className="text-center">
          <p className="text-xs tracking-[0.25em] uppercase text-[var(--color-champagne)] mb-3">
            New here?
          </p>
          <h2 className="text-2xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
            Sign up for free and get <span className="text-[var(--color-champagne)]">10 credits</span>
          </h2>
          <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed mb-6">
            To connect and chat with companions you need credits. Sign up now and we&apos;ll give you 10 credits to get started—no payment required.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              type="button"
              onClick={handleSignup}
              className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] bg-[var(--color-champagne)] text-[var(--color-obsidian)] hover:opacity-90 transition font-medium"
            >
              Sign up free
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="inline-block px-6 py-3 text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
