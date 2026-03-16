"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";

type Booking = {
  id: string;
  status: string;
  escort?: { aliasName: string };
};

const POLL_INTERVAL_MS = 4000;

export function BookingNotification() {
  const { user, token } = useAuth();
  const [acceptedBooking, setAcceptedBooking] = useState<{
    escortName: string;
    connectionId: string;
  } | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const prevStatusRef = useRef<Record<string, string>>({});
  const shownIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!token || user?.role !== "client") return;

    const poll = async () => {
      try {
        const res = await fetch("/api/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const bookings: Booking[] = data.bookings || [];

        for (const b of bookings) {
          const wasPending = prevStatusRef.current[b.id] === "pending";
          const nowAccepted = b.status === "accepted";

          if (wasPending && nowAccepted && !shownIdsRef.current.has(b.id)) {
            shownIdsRef.current.add(b.id);
            setAcceptedBooking({
              escortName: b.escort?.aliasName ?? "Companion",
              connectionId: b.id,
            });
            setDismissed(false);
            break;
          }
        }

        prevStatusRef.current = Object.fromEntries(
          bookings.map((b) => [b.id, b.status])
        );
      } catch {
        // ignore
      }
    };

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [token, user?.role]);

  if (!acceptedBooking || dismissed) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[calc(100%-2rem)] p-5 border border-[var(--color-champagne)] bg-[var(--color-obsidian)] shadow-lg animate-connection-accepted animate-celebrate-shimmer"
    >
      <div className="flex items-start gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full bg-[var(--color-champagne)]/20 border border-[var(--color-champagne)] flex items-center justify-center"
          aria-hidden
        >
          <svg className="w-5 h-5 text-[var(--color-champagne)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <p className="text-[var(--color-ivory)] font-light">
            <span className="text-[var(--color-champagne)] font-medium">{acceptedBooking.escortName}</span>{" "}
            has accepted your connection. You can now chat.
          </p>
          <a
            href={acceptedBooking.connectionId ? `/connections/${acceptedBooking.connectionId}` : "/dashboard"}
            className="mt-3 inline-block text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
          >
            Open chat
          </a>
          <button
            onClick={() => setDismissed(true)}
            className="mt-3 ml-4 text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
