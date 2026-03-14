"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type MemberProfile = {
  id: string;
  email: string | null;
  displayName: string | null;
  avatarSignedUrl: string | null;
  connected: boolean;
  connectionId: string | null;
  connectionStatus: string | null;
};

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);

  useEffect(() => {
    params.then((p) => setClientId(p.id));
  }, [params]);

  useEffect(() => {
    if (!token || !clientId) return;
    if (user?.role !== "escort") {
      router.push("/dashboard");
      return;
    }
    fetch(`/api/members/${clientId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then(setMember)
      .catch(() => setError("Member not found or access denied"))
      .finally(() => setLoading(false));
  }, [token, clientId, user?.role, router]);

  async function handleDisconnect() {
    if (!member?.connectionId || !token || disconnecting) return;
    setDisconnecting(true);
    setError("");
    try {
      const res = await fetch(`/api/bookings/${member.connectionId}/disconnect`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to disconnect");
      }
      const res2 = await fetch(`/api/members/${clientId}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (res2.ok) {
        const data = await res2.json();
        setMember(data);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading || !member) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center">
        {loading ? (
          <p className="text-[var(--color-silver)] font-light">Loading...</p>
        ) : (
          <div className="text-center">
            <p className="text-[var(--color-silver)] font-light mb-4">{error}</p>
            <Link
              href="/dashboard"
              className="text-sm tracking-widest uppercase text-[var(--color-champagne)] hover:text-[var(--color-champagne-light)] transition"
            >
              ← Dashboard
            </Link>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-2xl mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-champagne)] mb-10 transition"
        >
          ← Dashboard
        </Link>

        <div className="border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-6">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-full overflow-hidden border border-[var(--color-border)] bg-[var(--color-slate)] flex-shrink-0 flex items-center justify-center">
                {member.avatarSignedUrl ? (
                  <img
                    src={member.avatarSignedUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-[var(--color-muted)]">—</span>
                )}
              </div>
              <div>
                <h1 className="text-2xl font-light text-[var(--color-ivory)] flex flex-wrap items-center gap-3 tracking-wide">
                {(member.displayName || member.email) || "Member"}
                {member.connected && (
                  <span className="text-xs tracking-[0.2em] uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] px-2 py-1 rounded-sm">
                    Connected
                  </span>
                )}
                {member.connectionStatus === "pending" && (
                  <span className="text-xs tracking-[0.2em] uppercase border border-[var(--color-border)] text-[var(--color-silver)] px-2 py-1 rounded-sm">
                    Pending
                  </span>
                )}
              </h1>
              </div>
            </div>
          </div>

          {member.connected && member.connectionId && (
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/connections/${member.connectionId}`}
                className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
              >
                Open chat
              </Link>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="inline-block px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-border)] text-[var(--color-silver)] hover:bg-[var(--color-charcoal)] hover:border-[var(--color-muted)] transition disabled:opacity-50"
              >
                {disconnecting ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          )}
          {error && (
            <p className="mt-3 text-sm text-red-300/90">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
