"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const MEMBERSHIP_AMOUNT = parseInt(process.env.NEXT_PUBLIC_MEMBERSHIP_AMOUNT || "999", 10);
const RAZORPAY_KEY = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

type RazorpayOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: { email?: string };
  theme?: { color: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayInstance = {
  open: () => void;
};

export default function MembershipPage() {
  const router = useRouter();
  const { user, token, setUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (user?.role === "escort") {
      router.push("/dashboard");
      return;
    }
    if (user?.isPremiumMember) {
      router.push("/companions");
    }
  }, [user, router]);

  async function handleUnlock() {
    if (!token) {
      router.push("/login?redirect=/membership");
      return;
    }
    if (!RAZORPAY_KEY) {
      setError("Payment not configured. Contact support.");
      return;
    }
    if (!scriptLoaded || !window.Razorpay) {
      setError("Payment is loading. Please try again.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const orderRes = await fetch("/api/membership/create-order", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });
      if (!orderRes.ok) {
        const data = await orderRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create order");
      }
      const { order_id, amount } = await orderRes.json();

      const rzp = new window.Razorpay({
        key: RAZORPAY_KEY,
        amount,
        currency: "INR",
        name: "Escorta",
        description: "Premium membership unlock",
        order_id,
        handler: async (response) => {
          try {
            const unlockRes = await fetch("/api/membership/unlock", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              }),
            });
            if (!unlockRes.ok) {
              const data = await unlockRes.json().catch(() => ({}));
              throw new Error(data.error || "Verification failed");
            }
            setUser({ ...user!, isPremiumMember: true });
            router.push("/companions");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to unlock");
          } finally {
            setLoading(false);
          }
        },
        prefill: user?.email ? { email: user.email } : undefined,
        theme: { color: "#C9A962" },
        modal: {
          ondismiss: () => setLoading(false),
        },
      });
      rzp.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start payment");
      setLoading(false);
    }
  }

  if (user?.isPremiumMember) {
    return null;
  }

  return (
    <>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setScriptLoaded(true)}
      />
      <div className="pt-24 min-h-screen">
        <div className="max-w-lg mx-auto px-6 py-16">
        <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-2">
          Premium access
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Unlock the full experience
        </h1>
        <p className="text-[var(--color-silver)] font-light mb-10 leading-relaxed">
          One-time access to view all companion profiles and photos. Discreet, exclusive, unforgettable.
        </p>

        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 mb-8">
          <div className="flex items-baseline justify-between mb-6">
            <span className="text-[var(--color-silver)] font-light">One-time membership</span>
            <span className="text-2xl font-light text-[var(--color-champagne)]">
              ₹{MEMBERSHIP_AMOUNT}
            </span>
          </div>
          <ul className="space-y-3 text-[var(--color-pearl)] font-light text-sm mb-8">
            <li>• View all companion photos</li>
            <li>• Search premium companions</li>
            <li>• Full profile access</li>
          </ul>

          {error && (
            <p className="text-red-300/90 text-sm mb-4">{error}</p>
          )}

          {token ? (
            <button
              onClick={handleUnlock}
              disabled={loading}
              className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
            >
              {loading ? "Processing..." : `Unlock for ₹${MEMBERSHIP_AMOUNT}`}
            </button>
          ) : (
            <Link
              href="/login?redirect=/membership"
              className="block w-full py-3.5 text-center text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
            >
              Sign in to unlock
            </Link>
          )}
        </div>

        <Link href="/companions" className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition">
          ← Back to browse
        </Link>
        </div>
      </div>
    </>
  );
}
