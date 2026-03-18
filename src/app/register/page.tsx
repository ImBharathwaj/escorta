"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { trackEvent } from "@/lib/analytics";

const inputStyles =
  "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"client" | "escort">("client");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password required");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      login(data.token, data.user);
      trackEvent("signup", { role });
      if (data.verificationUrl) {
        setError("");
        window.location.href = data.verificationUrl;
        return;
      }
      if (data.user?.role === "client") {
        router.push("/onboarding");
      } else if (data.user?.email && !data.user?.emailVerifiedAt) {
        router.push("/dashboard/profile?verify=1");
      } else {
        router.push("/dashboard/profile");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="pt-24 min-h-screen flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md">
        <div className="border border-[var(--color-champagne)]/50 bg-[var(--color-champagne)]/5 rounded-sm p-5 mb-8">
          <p className="text-sm font-medium text-[var(--color-champagne)] tracking-wide">
            Sign up and get 10 credits for free
          </p>
        </div>
        <p className="text-xs tracking-[0.4em] uppercase text-[var(--color-champagne)] mb-2">
          Join Escorta
        </p>
        <h1 className="text-3xl md:text-4xl font-light text-[var(--color-ivory)] tracking-wide mb-2">
          Create an account
        </h1>
        <p className="text-[var(--color-silver)] font-light text-sm mb-8">
          Begin your journey
        </p>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
              {error}
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
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              required
              minLength={8}
            />
          </div>
          <div>
            <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-3 font-normal">
              I am a
            </label>
            <div className="flex gap-8">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="role"
                  value="client"
                  checked={role === "client"}
                  onChange={() => setRole("client")}
                  className="accent-[var(--color-champagne)]"
                />
                <span className="text-[var(--color-ivory)] font-light group-hover:text-[var(--color-champagne)] transition">
                  Member
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="radio"
                  name="role"
                  value="escort"
                  checked={role === "escort"}
                  onChange={() => setRole("escort")}
                  className="accent-[var(--color-champagne)]"
                />
                <span className="text-[var(--color-ivory)] font-light group-hover:text-[var(--color-champagne)] transition">
                  Companion
                </span>
              </label>
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>
        <p className="mt-8 text-[var(--color-silver)] font-light text-sm">
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
        <p className="mt-4 text-[var(--color-muted)] font-light text-[11px] leading-relaxed">
          By creating an account, you confirm that you are at least 18 years old and you agree to
          our{" "}
          <Link href="/terms" className="underline underline-offset-4 hover:text-[var(--color-ivory)]">
            Terms of Service
          </Link>
          ,{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-4 hover:text-[var(--color-ivory)]"
          >
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link
            href="/guidelines"
            className="underline underline-offset-4 hover:text-[var(--color-ivory)]"
          >
            Community Guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
