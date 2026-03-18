"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type NotifPrefs = {
  notifyEmailConnections: boolean;
  notifyEmailMessages: boolean;
  notifyEmailEarnings: boolean;
};

export default function SettingsPage() {
  const router = useRouter();
  const { user, token, authReady } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [prefs, setPrefs] = useState<NotifPrefs>({
    notifyEmailConnections: true,
    notifyEmailMessages: true,
    notifyEmailEarnings: true,
  });

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      router.push("/login?redirect=/settings");
      return;
    }
    fetch("/api/users/me/notification-preferences", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => {
        setPrefs({
          notifyEmailConnections: d.notifyEmailConnections ?? true,
          notifyEmailMessages: d.notifyEmailMessages ?? true,
          notifyEmailEarnings: d.notifyEmailEarnings ?? true,
        });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [authReady, token, router]);

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/users/me/notification-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(prefs),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: keyof NotifPrefs) => {
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="pt-24 min-h-screen flex items-center justify-center text-[var(--color-silver)]">
        Loading…
      </div>
    );
  }

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-lg mx-auto px-6 py-16">
        <Link
          href="/dashboard"
          className="inline-block text-sm tracking-widest uppercase text-[var(--color-silver)] hover:text-[var(--color-ivory)] mb-10 transition"
        >
          ← Dashboard
        </Link>

        <p className="text-xs tracking-[0.3em] uppercase text-[var(--color-champagne)] mb-2">
          Settings
        </p>
        <h1 className="text-2xl font-light text-[var(--color-ivory)] tracking-wide mb-10">
          Notification preferences
        </h1>

        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
            <div>
              <p className="text-[var(--color-ivory)] text-sm font-light">Connection requests</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Email when someone sends or accepts a connection request
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notifyEmailConnections}
              onClick={() => toggle("notifyEmailConnections")}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs.notifyEmailConnections ? "bg-[var(--color-champagne)]" : "bg-[var(--color-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.notifyEmailConnections ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
            <div>
              <p className="text-[var(--color-ivory)] text-sm font-light">Messages</p>
              <p className="text-xs text-[var(--color-muted)] mt-0.5">
                Email when you receive a new chat message while offline
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs.notifyEmailMessages}
              onClick={() => toggle("notifyEmailMessages")}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                prefs.notifyEmailMessages ? "bg-[var(--color-champagne)]" : "bg-[var(--color-border)]"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                  prefs.notifyEmailMessages ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {(user?.role === "escort") && (
            <div className="flex items-center justify-between gap-4 p-4 border border-[var(--color-border)] bg-[var(--color-charcoal)]">
              <div>
                <p className="text-[var(--color-ivory)] text-sm font-light">Earnings</p>
                <p className="text-xs text-[var(--color-muted)] mt-0.5">
                  Email when you receive tips or earnings from calls
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={prefs.notifyEmailEarnings}
                onClick={() => toggle("notifyEmailEarnings")}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  prefs.notifyEmailEarnings ? "bg-[var(--color-champagne)]" : "bg-[var(--color-border)]"
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
                    prefs.notifyEmailEarnings ? "translate-x-5" : ""
                  }`}
                />
              </button>
            </div>
          )}
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-3 text-sm tracking-widest uppercase border border-[var(--color-champagne)] text-[var(--color-champagne)] hover:bg-[var(--color-champagne)] hover:text-[var(--color-obsidian)] transition disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save preferences"}
          </button>
          {saved && (
            <span className="text-sm text-green-400 font-light">Saved</span>
          )}
        </div>
      </div>
    </div>
  );
}
