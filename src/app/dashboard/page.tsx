"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { BlurredImage } from "@/components/BlurredImage";

type Booking = {
  id: string;
  status: string;
  bookingTime: string | null;
  durationMinutes: number | null;
  price: number | null;
  message: string | null;
  createdAt: string;
  client?: {
    id: string;
    email: string | null;
    displayName?: string | null;
    avatarSignedUrl?: string | null;
  };
  escort?: { id: string; aliasName: string; primaryPhotoId?: string | null };
};

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, token, logout, authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [responding, setResponding] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/dashboard");
      return;
    }
    setLoading(false);
  }, [token, authReady, router]);

  const fetchBookings = useCallback(() => {
    if (!token) return;
    fetch("/api/bookings", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => setBookings(data.bookings || []))
      .catch(() => setBookings([]));
  }, [token]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Poll for clients with pending bookings so status updates in real time
  useEffect(() => {
    if (!token || user?.role !== "client") return;
    const pending = bookings.filter((b) => b.status === "pending");
    if (pending.length === 0) return;
    const id = setInterval(fetchBookings, 4000);
    return () => clearInterval(id);
  }, [token, user?.role, bookings, fetchBookings]);

  // Poll for escorts so they see new incoming requests as soon as clients send them
  useEffect(() => {
    if (!token || user?.role !== "escort") return;
    const id = setInterval(fetchBookings, 4000);
    return () => clearInterval(id);
  }, [token, user?.role, fetchBookings]);

  const respond = async (bookingId: string, status: "accepted" | "rejected") => {
    if (!token) return;
    setResponding(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/respond`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setBookings((prev) =>
          prev.map((b) =>
            b.id === bookingId ? { ...b, status } : b
          )
        );
      }
    } finally {
      setResponding(null);
    }
  };

  const handleDisconnect = async (bookingId: string) => {
    if (!token) return;
    setDisconnecting(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/disconnect`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) fetchBookings();
    } finally {
      setDisconnecting(null);
    }
  };

  const booked = searchParams.get("booked") === "1";
  const connected = searchParams.get("connected") === "1";
  const pending = bookings.filter((b) => b.status === "pending");
  const accepted = bookings.filter((b) => b.status === "accepted");
  // One pending request per escort for client (avoid duplicate cards)
  const pendingByEscort =
    user?.role === "client"
      ? pending.filter(
          (b, i, arr) =>
            !b.escort || arr.findIndex((x) => x.escort?.id === b.escort?.id) === i
        )
      : [];
  // One connection per escort for client (avoid duplicate cards for same companion)
  const connectionsByEscort = accepted.filter(
    (b, i, arr) => !b.escort || arr.findIndex((x) => x.escort?.id === b.escort?.id) === i
  );
  // One row per client for escort (avoid duplicate entries for same member)
  const connectionsByClient = accepted.filter(
    (b, i, arr) => !b.client || arr.findIndex((x) => x.client?.id === b.client?.id) === i
  );

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)] font-light">
        Loading...
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          Your account
        </p>
        <h1 className="text-3xl font-light text-[var(--color-ivory)] tracking-wide mb-12">
          Dashboard
        </h1>

        {(booked || searchParams.get("connected") === "1") && (
          <div className="mb-10 p-5 border border-[var(--color-champagne)]/30 bg-[var(--color-champagne)]/5 text-[var(--color-champagne)] text-sm font-light">
            Your connection request has been sent. The companion will respond when they can.
          </div>
        )}

        {user?.role === "client" && pendingByEscort.length > 0 && (
          <div className="mb-10 p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
            <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-1">
              Connection requests you&apos;ve sent
            </h2>
            <p className="text-sm text-[var(--color-silver)] font-light mb-4">
              Awaiting response from the companion. You&apos;ll be able to chat once they accept.
            </p>
            <div className="space-y-3">
              {pendingByEscort.map((b) => (
                <div
                  key={b.id}
                  className="p-4 border border-[var(--color-border)] bg-[var(--color-obsidian)] flex justify-between items-center gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                      {b.escort?.primaryPhotoId ? (
                        <BlurredImage photoId={b.escort.primaryPhotoId} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg text-[var(--color-muted)]">—</span>
                      )}
                    </div>
                    <div>
                      <p className="text-[var(--color-ivory)] font-light">
                        {b.escort ? (
                          <Link
                            href={`/escorts/${b.escort.id}`}
                            className="hover:text-[var(--color-champagne)] transition"
                          >
                            {b.escort.aliasName ?? "Companion"}
                          </Link>
                        ) : (
                          "Companion"
                        )}
                      </p>
                      <span className="text-xs tracking-widest uppercase text-[var(--color-silver)]">
                        Pending
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {user?.role === "client" && connectionsByEscort.length > 0 && (
          <div className="mb-10 p-6 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
            <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-1">
              Your connections
            </h2>
            <p className="text-sm text-[var(--color-silver)] font-light mb-4">
              You can chat with any of them from the chat list (icon in the bottom right). When a companion accepts your request, they appear here and in the chat list.
            </p>
            <div className="space-y-3">
              {connectionsByEscort.map((b) => (
                <div
                  key={b.id}
                  className="p-4 border border-[var(--color-border)] bg-[var(--color-obsidian)] flex justify-between items-center gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                      {b.escort?.primaryPhotoId ? (
                        <BlurredImage photoId={b.escort.primaryPhotoId} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-lg text-[var(--color-muted)]">—</span>
                      )}
                    </div>
                    <div>
                    <p className="text-[var(--color-ivory)] font-light">
                      {b.escort ? (
                        <Link
                          href={`/escorts/${b.escort.id}`}
                          className="hover:text-[var(--color-champagne)] transition"
                        >
                          {b.escort.aliasName ?? "Companion"}
                        </Link>
                      ) : (
                        "Companion"
                      )}
                    </p>
                    <span
                      className={`text-xs tracking-widest uppercase ${
                        b.status === "accepted"
                          ? "text-[var(--color-champagne)]"
                          : b.status === "rejected"
                            ? "text-[var(--color-muted)]"
                            : "text-[var(--color-silver)]"
                      }`}
                    >
                      {b.status === "accepted" ? "Connected" : b.status}
                    </span>
                    </div>
                  </div>
                  {b.status === "accepted" && (
                    <Link
                      href={`/connections/${b.id}`}
                      className="px-4 py-2 text-sm border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
                    >
                      Chat
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {user?.role === "escort" && (
          <div className="mb-10 p-6 border border-[var(--color-champagne)]/40 bg-[var(--color-champagne)]/10">
            <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
              Connection requests
            </h2>
            {pending.length === 0 ? (
              <p className="text-sm text-[var(--color-silver)] font-light">
                No pending requests. You&apos;ll see new connection requests here when members reach out.
              </p>
            ) : (
              <>
                <p className="text-sm text-[var(--color-silver)] mb-4">
                  {pending.length} pending request{pending.length !== 1 ? "s" : ""}
                </p>
                <div className="space-y-4">
                  {pending.map((b) => (
                <div
                  key={b.id}
                  className="p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)]"
                >
                  <p className="text-[var(--color-ivory)] font-light flex items-center gap-2">
                    From:{" "}
                    {b.client ? (
                      <Link
                        href={`/members/${b.client.id}`}
                        className="text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
                      >
                        {(b.client.displayName || b.client.email) ?? "Member"}
                      </Link>
                    ) : (
                      "Member"
                    )}
                  </p>
                  {b.message && (
                    <p className="text-sm text-[var(--color-muted)] mt-2 italic">
                      &ldquo;{b.message}&rdquo;
                    </p>
                  )}
                  <div className="flex gap-3 mt-2">
                    <button
                      onClick={() => respond(b.id, "accepted")}
                      disabled={responding === b.id}
                      className="px-4 py-2 text-sm bg-[var(--color-champagne)] text-[var(--color-obsidian)] hover:opacity-90 disabled:opacity-50 transition"
                    >
                      {responding === b.id ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => respond(b.id, "rejected")}
                      disabled={responding === b.id}
                      className="px-4 py-2 text-sm border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-champagne)]/10 disabled:opacity-50 transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
                </div>
              </>
            )}
            {user?.role === "escort" && connectionsByClient.length > 0 && (
              <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                <h3 className="text-sm font-light text-[var(--color-ivory)] mb-3">Active connections</h3>
                <div className="space-y-2">
                  {connectionsByClient.map((b) => (
                    <div key={b.id} className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                          {b.client?.avatarSignedUrl ? (
                            <img src={b.client.avatarSignedUrl} alt="" className="w-full h-full object-cover" draggable={false} onContextMenu={(e) => e.preventDefault()} />
                          ) : (
                            <span className="text-sm text-[var(--color-muted)]">—</span>
                          )}
                        </div>
                        {b.client ? (
                          <Link
                            href={`/members/${b.client.id}`}
                            className="text-[var(--color-silver)] hover:text-[var(--color-champagne)] transition truncate"
                          >
                            {(b.client.displayName || b.client.email) ?? "Member"}
                          </Link>
                        ) : (
                          <span className="text-[var(--color-silver)]">Member</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Link
                          href={`/connections/${b.id}`}
                          className="text-sm text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)]"
                        >
                          Chat
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDisconnect(b.id)}
                          disabled={disconnecting === b.id}
                          className="text-xs text-[var(--color-muted)] hover:text-[var(--color-silver)] transition disabled:opacity-50"
                        >
                          {disconnecting === b.id ? "…" : "Disconnect"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {user?.role === "client" && (
          <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] p-6 mb-6">
            <h3 className="text-sm font-light text-[var(--color-silver)] mb-1">Credits</h3>
            <p className="text-2xl font-light text-[var(--color-champagne)] mb-2">{user?.credits ?? 0} credits</p>
            <p className="text-xs text-[var(--color-muted)] mb-3">Use credits to connect with companions and send messages.</p>
            <Link
              href="/membership"
              className="text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
            >
              Get more credits
            </Link>
          </div>
        )}

        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 mb-10">
          <p className="text-[var(--color-silver)] font-light">
            Signed in as{" "}
            <span className="text-[var(--color-ivory)]">{user?.email}</span>
            <span className="text-[var(--color-muted)]"> · </span>
            <span className="text-[var(--color-champagne)]">{user?.role}</span>
          </p>
          <button
            onClick={logout}
            className="mt-4 text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
          >
            Sign out
          </button>
        </div>

        <div className="flex flex-wrap gap-3 mt-6">
          <Link
            href="/dashboard/profile"
            className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
          >
            {user?.role === "escort" ? "Manage profile" : "Profile & preferences"}
          </Link>
          <Link
            href="/dashboard/credits"
            className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:text-[var(--color-ivory)] hover:border-[var(--color-silver)]/50 transition"
          >
            {user?.role === "escort" ? "Credits earned" : "Credit usage"}
          </Link>
        </div>

        <div className="mt-16">
          <Link
            href="/companions"
            className="text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] transition"
          >
            ← Browse companions
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">
          Loading...
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
