"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function BookingForm({
  escortId,
  escortName,
}: {
  escortId: string;
  escortName: string;
}) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent("/escorts/" + escortId)}`);
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    const date = formData.get("date") as string;
    const time = formData.get("time") as string;
    const duration = parseInt(formData.get("duration") as string) || 60;
    const message = formData.get("message") as string;

    const bookingTime = `${date}T${time}:00`;

    setLoading(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          escort_id: escortId,
          booking_time: bookingTime,
          duration_minutes: duration,
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Booking failed");
      }
      router.push("/dashboard?booked=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setLoading(false);
    }
  }

  const formStyles =
    "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition";

  if (!user) {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Request an encounter
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm leading-relaxed">
          <Link
            href={`/login?redirect=${encodeURIComponent("/escorts/" + escortId)}`}
            className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
          >
            Sign in
          </Link>{" "}
          or{" "}
          <Link
            href="/register"
            className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition underline underline-offset-4"
          >
            create an account
          </Link>{" "}
          to send a discreet request to {escortName}.
        </p>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Request an encounter
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm">
          Only members can send booking requests. Please use a client account.
        </p>
      </div>
    );
  }

  return (
    <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
      <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-6">
        Request an encounter
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Date
          </label>
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().split("T")[0]}
            className={formStyles}
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Time
          </label>
          <input type="time" name="time" required className={formStyles} />
        </div>
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Duration (minutes)
          </label>
          <input
            type="number"
            name="duration"
            defaultValue={60}
            min={30}
            step={30}
            className={formStyles}
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Message
          </label>
          <textarea
            name="message"
            rows={3}
            placeholder="Optional — any special requests or notes"
            className={`${formStyles} resize-none`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Sending..." : "Send request"}
        </button>
      </form>
    </div>
  );
}
