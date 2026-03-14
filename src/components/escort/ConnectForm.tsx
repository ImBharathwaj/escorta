"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

export default function ConnectForm({
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
  const [existingConnection, setExistingConnection] = useState<{ id: string; status: string } | null>(null);

  useEffect(() => {
    if (!token || user?.role !== "client") return;
    fetch("/api/bookings", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        const list = (data.bookings || []).filter(
          (b: { escort?: { id: string }; escortId?: string }) => (b.escort?.id || b.escortId) === escortId
        );
        const accepted = list.find((b: { status: string }) => b.status === "accepted");
        const pending = list.find((b: { status: string }) => b.status === "pending");
        const rejected = list.find((b: { status: string }) => b.status === "rejected");
        const conn = accepted ?? pending ?? rejected;
        if (conn) setExistingConnection({ id: conn.id, status: conn.status });
      })
      .catch(() => {});
  }, [token, user?.role, escortId]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!token) {
      router.push(`/login?redirect=${encodeURIComponent("/escorts/" + escortId)}`);
      return;
    }

    const form = e.currentTarget;
    const message = (form.elements.namedItem("message") as HTMLTextAreaElement)?.value?.trim();

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
          message: message || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to connect");
      }
      router.push("/dashboard?connected=1");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setLoading(false);
    }
  }

  const formStyles =
    "w-full px-4 py-3 bg-[var(--color-charcoal)] border border-[var(--color-border)] text-[var(--color-ivory)] focus:border-[var(--color-champagne)]/50 transition rounded-sm";

  if (!user) {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Connect with {escortName}
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
          to connect and start a conversation with {escortName}.
        </p>
      </div>
    );
  }

  if (user.role !== "client") {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Connect with {escortName}
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm">
          Use a member account to connect with companions.
        </p>
      </div>
    );
  }

  if (existingConnection?.status === "accepted") {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          You&apos;re connected
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm mb-4">
          You can now chat with {escortName} to arrange meetups.
        </p>
        <Link
          href={`/connections/${existingConnection.id}`}
          className="block w-full py-3.5 text-center text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition"
        >
          Open chat
        </Link>
      </div>
    );
  }

  if (existingConnection?.status === "pending") {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Connection requested
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm">
          You can send only one intro message before they respond. Your request is pending—you&apos;ll be able to chat once {escortName} accepts.
        </p>
      </div>
    );
  }

  if (existingConnection?.status === "rejected") {
    return (
      <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
        <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
          Request declined
        </h2>
        <p className="text-[var(--color-silver)] font-light text-sm">
          Your connection request was declined. You cannot chat with {escortName} for this request.
        </p>
      </div>
    );
  }

  return (
    <div className="sticky top-24 border border-[var(--color-border)] bg-[var(--color-charcoal)] p-8 rounded-sm">
      <h2 className="text-lg font-light text-[var(--color-ivory)] tracking-wide mb-4">
        Connect with {escortName}
      </h2>
      <p className="text-[var(--color-silver)] font-light text-sm mb-6">
        Send a connection request. You can include one intro message here—you&apos;ll be able to chat without limit once they accept.
      </p>
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 text-sm text-red-300/90 border border-red-500/30 bg-red-500/10 rounded-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs tracking-[0.15em] uppercase text-[var(--color-silver)] mb-2 font-normal">
            Intro message (optional, one message until they accept)
          </label>
          <textarea
            name="message"
            rows={3}
            placeholder="Say hello or share what you have in mind..."
            className={`${formStyles} resize-none`}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50 disabled:cursor-not-allowed rounded-sm"
        >
          {loading ? "Sending..." : "Connect"}
        </button>
      </form>
    </div>
  );
}
